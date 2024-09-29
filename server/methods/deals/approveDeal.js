import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import dwollaTransferOut from '../../dwolla/transferOut';
import { sendDealApprovedEmail } from '../../emails/emails';
import Security from '../../utils/security';
import Deals from '../../collections/deals';
import checkForDuplicateDeposit from '../../dwolla/checkForDuplicateDeposit';
import logger from '../../logger/log';
import notifyUser from '../../notifications/notifyUser';
import * as Sentry from '@sentry/node';
import { NotifyChannel } from '../../notifications/notifyChannel';
import { STAGE, STATUS, SUB_STATUS } from '../../consts/user';
import changeStage from '../../methods/users/changeStage';
import changeStatus from '../users/changeStatus';
import changeSubStatus from '../users/changeSubStatus';

function checkCashAdvance(_deal) {
  if (_deal.status === 'approved' || _deal.transferUrl) throw new Meteor.Error('TRANSFER_INITIATED');
  if (_deal.lock) throw new Meteor.Error('LOCKED');
}

function touch(dealID) {
  const updated = Deals.update({ _id: dealID }, { $set: { lock: true } });
  if (!updated) throw new Meteor.Error('ERROR_UPDATING_DEAL');
}

function untouch(dealID) {
  const updated = Deals.update({ _id: dealID }, { $unset: { lock: '' } });
  if (!updated) throw new Meteor.Error('ERROR_UPDATING_DEAL');
}

async function sendSMS(userId, amount, bankAccountMask) {
  await notifyUser({
    body: `Your USD${amount} cash advance was approved, now is on its way to your bank account ending in: ${bankAccountMask}, it can take up to 24 banking hours.`,
    service: 'accNotification',
    userId,
    channel: NotifyChannel.SMS
  });
}

export async function approveDeal(dealID, forceDuplicate, forceACH, by) {
  check(dealID, String);

  try {
    let checkForDuplicate = true;
    if (forceDuplicate && Security.hasRole(Meteor.userId(), ['super-admin', 'technical'])) {
      checkForDuplicate = false;
    }

    const Deal = Deals.findOne({ _id: dealID });
    const User = Meteor.users.findOne({ _id: Deal.userId });

    checkCashAdvance(Deal);
    touch(dealID);

    if (checkForDuplicate) await checkForDuplicateDeposit(User.dwollaCustomerURL, Deal);

    const transferMetadata = {
      dealId: Deal._id,
      userId: User._id,
      transferReason: 'cash_advance_transfer'
    };

    const approvedAt = new Date();

    let RTPEnabled = Deal.transferChannel === 'RTP';

    if (forceACH) {
      RTPEnabled = false;
    }

    const transferUrl = await dwollaTransferOut(
      User.dwollaFundingURL,
      Deal.amount,
      transferMetadata,
      Deal.idempotencyKey,
      RTPEnabled
    );

    const set = {
      status: 'approved',
      approvedAt,
      preApprovedAt: approvedAt,
      transferUrl
    };

    if (forceACH) set.transferChannel = 'ACH';

    Deals.update({ _id: dealID }, { $set: set, $unset: { ControlTag: '' } });

    Meteor.users.update(
      { _id: Deal.userId },
      {
        $set: {
          'currentCashAdvance.status': set.status,
          'currentCashAdvance.preApprovedAt': set.approvedAt,
          'currentCashAdvance.approvedAt': set.approvedAt
        }
      }
    );

    if ([STAGE.SALES.STAGE_7, STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10].includes(User?.offStage?.stage)) {

      if (User?.offStage?.stage === STAGE.SALES.STAGE_7) {
        await changeStage({
          userId: User._id,
          stage: STAGE.SALES.STAGE_8,
        });

      } else {
        await changeStatus({
          userId: User._id,
          agentId: by || undefined,
          status: STATUS.APPROVED_DEAL_IN_PROCESS
        });

        await changeSubStatus({
          userId: User._id,
          agentId: by || undefined,
          subStatus: SUB_STATUS.TRANSFER_PENDING
        });
      }
    }

    const docId = Deal?.mca?.docId;

    sendDealApprovedEmail(User, { ...Deal, approvedAt: set.approvedAt }, set, docId);

    await sendSMS(User._id, Deal.amount, User.bankAccount.mask);

  } catch (error) {
    untouch(dealID);

    if (error.body && error.body._embedded && error.body._embedded.errors) {
      throw new Meteor.Error(error.body._embedded.errors[0].message);
    }

    if (error.error) throw new Meteor.Error(error.error);
    Sentry.captureException(error);
    logger.error(`deals.approve [${dealID}] ${JSON.stringify(error)}`);
    throw new Meteor.Error(error);
  }
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.approve'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: function approveDealMethod(dealID, forceDuplicate, forceACH) {
    if (!Security.hasRole(Meteor.userId(), ['super-admin', 'admin'])) {
      throw new Meteor.Error('NOT_AUTHORIZED', 'You are not authorized');
    }
    return approveDeal(dealID, forceDuplicate, forceACH, Meteor.userId());
  }
});
