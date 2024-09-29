import { Meteor } from 'meteor/meteor';
import Deals from '../../../collections/deals';
import checkAllPayments from './checkAllPayments';
import insertLog from '../../logs/insertGenericLog';
import shouldUpgradeOrDowngrade, { downgrade } from './shouldUpgradeOrDowngrade';
import { queueCheckIfDealIsNotTaken, queueCheckUserAndSuspend } from '../../../queue/queue';
import checkIfValidAndRequestAssetReport from '../../users/plaid/checkIfValidAndRequestAssetReport';
import updateInteraction from '../../users/updateInteraction';
import Security from '../../../utils/security';
import isPastedFourWeeks from './isPastedFourWeeks';
import notifyUser from '../../../notifications/notifyUser';
import { NotifyChannel } from '../../../notifications/notifyChannel';
import categorization, { downgradeCategory } from '../../users/categorization';
import assignAgent from '../../validation/assignAgent';
import { STAGE, STATUS, SUB_STATUS } from '../../../consts/user';
import changeStage from '../../users/changeStage';
import changeStatus from '../../users/changeStatus';
import changeSubStatus from '../../users/changeSubStatus';

function notify(user) {
  const { _id } = user;

  notifyUser({
    body: 'Thank you, you have completed your cash advance. You can request another cash advance at any time using the Ualett App',
    service: 'accNotification',
    userId: _id,
    channel: NotifyChannel.PUSH
  });
}

const STATES_NOT_ALLOWED = [];

const SUSPENDED_FOR_EXPIRED_DEAL_MSG = 'SUSPENDED FOR EXPIRED DEAL';

const SUSPENDED_FOR_BAD_BEHAVIOR_MSG = 'SUSPENDED FOR BAD BEHAVIOR';

export default async function completeDeal(id) {
  const deal = Deals.findOne({ _id: id });

  if (!deal) throw new Meteor.Error('Cash advance not found');

  const { payments } = deal;

  const result = await checkAllPayments(payments);

  const dealSet = {
    status: 'completed',
    completeAt: new Date(),
    accountingStatus: ''
  };

  if (payments.length === 1 && payments[0].amount === deal.amount) {
    dealSet.accountingStatus = 'deal_refunded';
  }

  const updated = Deals.update(
    { _id: id },
    {
      $set: dealSet
    }
  );

  if (!updated) throw new Meteor.Error('fail updating deal');

  Meteor.call('timelogs.insert', {
    userId: deal.userId,
    event: 'deal completed',
    type: 'deal',
    eventType: 'user',
    metadata: {
      amount: deal.amount
    }
  });

  const user = Meteor.users.findOne({ _id: deal.userId });

  const inc = {
    'metrics.cashAdvances.totalPaid': result.totalPaid
  };

  if (user.metrics.cashAdvances && user.metrics.cashAdvances.count === 0) inc['metrics.cashAdvances.count'] = 1;

  // validate if the clien need Audit
  const set = { currentCashAdvance: false };
  // if (
  //   compareAsc(new Date(), new Date(user.documents.driverLicense.info.exp)) ==
  //     1 ||
  //   isThisYear(
  //     user.plaidAssetReport[user.plaidAssetReport.length - 1].requestedAt
  //   ) == false
  // ) {
  //   set = { currentCashAdvance: false, needsAudit: true };
  // }
  ///
  const isDealExpired = await isPastedFourWeeks(deal);
  const upgradeOrDowndrade = await shouldUpgradeOrDowngrade(
    deal.metrics.failedPayments,
    deal.payments,
    user,
    deal.metrics.returnCodes,
    isDealExpired,
    user.metrics.cashAdvances.count + 1
  );

  const isStateNotAllowed = STATES_NOT_ALLOWED.includes(user.address.state);

  if (
    (isDealExpired.status === true && user.metrics.cashAdvances && user.metrics.cashAdvances.count + 1 < 5) ||
    isStateNotAllowed
  ) {
    if (
      (isDealExpired.status === true &&
        isDealExpired.message === 'WeeksPaid is greater than 5' &&
        ['c', 'xl'].includes(user.category)) ||
      (isDealExpired.status === true &&
        isDealExpired.message === 'WeeksPaid is equal 5' &&
        ['c', 'xl'].includes(user.category)) ||
      (isDealExpired.status === true && isDealExpired.message === 'WeeksPaid is greater than 5')
    ) {
      downgradeCategory(user._id, user.categoryType, SUSPENDED_FOR_EXPIRED_DEAL_MSG);
      insertLog(deal.userId, 'this customer has been sent to validate because he pasted the 5 weeks');
      assignAgent({
        userId: user._id,
        category: 'validate'
      });
      Meteor.users.update({ _id: user._id }, { $set: { 'status.verified': false } });
    }

    if (isDealExpired.status === true && isDealExpired.message === 'WeeksPaid is equal 5') {
      const { newCategory } = downgrade(user.category, user._id);
      set.category = newCategory;
      insertLog(deal.userId, `DOWNGRADED: ${user.category.toUpperCase()} to ${newCategory.toUpperCase()}`);
    }
    if (isStateNotAllowed) {
      updateInteraction({
        userId: deal.userId,
        status: 'suspended',
        by: {
          name: 'system'
        },
        flow: 'repetition'
      });
      insertLog(
        deal.userId,
        isStateNotAllowed ? `Deal disabled for this state: ${user.address.state}` : SUSPENDED_FOR_EXPIRED_DEAL_MSG
      );
      set.category = 'suspended';
    }
  } else if (upgradeOrDowndrade) {
    const { upOrDown, newCategory } = upgradeOrDowndrade;

    if (['up', 'down', 'suspend'].includes(upOrDown)) {
      set.category = newCategory;

      if (upOrDown === 'up') {
        insertLog(deal.userId, `UPGRADED: ${user.category.toUpperCase()} to ${newCategory.toUpperCase()}`);
      }

      if (upOrDown === 'down') {
        insertLog(deal.userId, `DOWNGRADED: ${user.category.toUpperCase()} to ${newCategory.toUpperCase()}`);
      }

      if (upOrDown === 'suspend') {
        updateInteraction({
          userId: deal.userId,
          status: 'suspended',
          by: {
            name: 'system'
          },
          flow: 'repetition'
        });
        insertLog(deal.userId, SUSPENDED_FOR_BAD_BEHAVIOR_MSG);

        Meteor.call('timelogs.insert', {
          userId: user._id,
          event: SUSPENDED_FOR_BAD_BEHAVIOR_MSG,
          type: 'account',
          eventType: 'user',
          metadata: {
            type: 'suspended'
          }
        });
      }

      Meteor.call('timelogs.insert', {
        userId: deal.userId,
        event: 'system category changed',
        type: 'account',
        eventType: 'user',
        metadata: {
          change: `${upOrDown === 'up'
            ? 'UPGRADED'
            : upOrDown === 'down'
              ? 'DOWNGRADED'
              : upOrDown === 'suspend'
                ? 'SUSPENDED'
                : ''
            } ${user.category.toUpperCase()} to ${newCategory.toUpperCase()}`
        },
        _by: { id: 'system', name: 'system' }
      });
    } else if (['enableUp'].includes(upOrDown)) {
      set.upgradeEnabled = true;
      insertLog(deal.userId, 'UPGRADE ENABLED');
      Meteor.call('timelogs.insert', {
        userId: deal.userId,
        event: 'system upgrade enabled',
        type: 'account',
        eventType: 'user'
      });
    }
  }

  const CATEGORY_NOT_ALLOWED = 'repetition';

  await Meteor.users.updateAsync(
    { _id: user._id },
    {
      $inc: inc,

      $set: { ...set, assignedAgent: user.assignedAgent.filter(({ category }) => category !== CATEGORY_NOT_ALLOWED) }
    }
  );

  await Deals.updateAsync(
    { _id: deal._id },
    {
      $set: {
        assignedAgent: deal.assignedAgent?.filter(({ category }) => category !== CATEGORY_NOT_ALLOWED)
      }
    }
  );

  if ([STAGE.UNDERWRITING.STAGE_9, STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10].includes(user?.offStage?.stage)) {

    if (user?.offStage?.stage === STAGE.UNDERWRITING.STAGE_9) {
      await changeStage({
        userId: user._id,
        stage: STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10
      });
    }

    await changeStatus({
      userId: user._id,
      status: STATUS.WAITING_FOR_CLIENT_REQUEST
    });

    await changeSubStatus({
      userId: user._id,
      subStatus: SUB_STATUS.ACTION_NEEDED
    });
  }

  queueCheckUserAndSuspend({ userId: deal.userId, schedule: 'in 31 day' });
  queueCheckIfDealIsNotTaken({ userId: deal.userId, schedule: 'in 3 months' });
  checkIfValidAndRequestAssetReport(deal.userId);
  categorization(deal.userId);

  if (!isStateNotAllowed && upgradeOrDowndrade.upOrDown !== 'suspend') {
    notify(user);
  }

  return result;
}

Meteor.methods({
  'deals.complete': function completeDealMethod(params) {
    Security.checkIfAdmin(Meteor.userId());
    return completeDeal(params);
  }
});
