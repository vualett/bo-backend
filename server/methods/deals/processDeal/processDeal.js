/* eslint-disable no-extra-boolean-cast */
/* eslint-disable dot-notation */
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { $ } from 'moneysafe';
import { addDays, getISODay } from 'date-fns';
import Deals from '../../../collections/deals';
import { sendDealTransferProcessedEmail } from '../../../emails/emails';
import Security from '../../../utils/security';
import Invitations from '../../../collections/invitations';
import getPaymentDay from './getPaymentDay';
import { GetArrayPayments } from '../../../utils/calculateInstallments';
import { capitalizeFirstLetterOfEachWord } from '../../../utils/utils';
import { InvitationStatusOptions } from '../../invitations/invitationStatusOptions';
import updatePromotersPanelInvitation from '../../invitations/updatePromotersPanelInvitation';
import changeStage from '../../users/changeStage';
import { STAGE, STATUS } from '../../../consts/user';
import { ROLES } from '../../../consts/roles';
import changeStatus from '../../users/changeStatus';

async function checkIfFirstDealandMarkItAsCustomer(user, deal) {
  const history = await Deals.find({
    userId: user._id,
    status: 'completed'
  }).fetch();

  if ((user.metrics && user.metrics.cashAdvances.count > 1) || history.length > 0) {
    const repetitionAssignedAgent = user?.assignedAgent?.find((item) => item.category === 'repetition');
    Meteor.call('timelogs.insert', {
      userId: deal.userId,
      dealId: deal._id,
      event: 'deal active',
      type: 'deal',
      eventType: 'user',
      metadata: {
        amount: deal.amount
      },
      ...(!!repetitionAssignedAgent
        ? {
          _by: {
            name: capitalizeFirstLetterOfEachWord(
              `${repetitionAssignedAgent?.agent?.firstName} ${repetitionAssignedAgent?.agent?.lastName}`
            ),
            id: repetitionAssignedAgent?.agent?.id
          }
        }
        : {})
    });
    return;
  }

  const onboardingAssignedAgent = user?.assignedAgent?.find((item) => item.category === ROLES.ONBOARDING);
  const salesAssignedAgent = user?.assignedAgent?.find((item) => item.category === ROLES.SALES);

  let assignedAgent = {};
  if (onboardingAssignedAgent) {
    assignedAgent = {
      _by: {
        name: capitalizeFirstLetterOfEachWord(
          `${onboardingAssignedAgent?.agent?.firstName} ${onboardingAssignedAgent?.agent?.lastName}`
        ),
        id: onboardingAssignedAgent?.agent?.id
      }
    };
  } else if (salesAssignedAgent) {
    assignedAgent = {
      _by: {
        name: capitalizeFirstLetterOfEachWord(
          `${salesAssignedAgent?.agent?.firstName} ${salesAssignedAgent?.agent?.lastName}`
        ),
        id: salesAssignedAgent?.agent?.id
      }
    };
  }

  Meteor.call('timelogs.insert', {
    userId: deal.userId,
    dealId: deal._id,
    event: 'deal active',
    type: 'deal',
    eventType: 'user',
    metadata: {
      amount: deal.amount
    },
    ...(!!assignedAgent ? assignedAgent : {})
  });

  const invitation = Invitations.findOne({ userId: user._id });

  if (invitation && !invitation.firstCashAdvanceAmount) {
    Invitations.update(
      { _id: invitation._id },
      {
        $set: {
          firstCashAdvanceAmount: deal.amount,
          firstCashAdvanceApprovedDate: deal.approvedAt,

          status: InvitationStatusOptions.DEAL_TAKEN
        }
      }
    );
  }

  Meteor.defer(() => {
    updatePromotersPanelInvitation({ _id: invitation._id });
  });
}

export default async function processDeal(id, by) {
  const Deal = Deals.findOne({ _id: id });
  if (!Deal) throw new Meteor.Error(`Deal not fount with ID:${id}`);

  if (Deal.status === 'active') throw new Meteor.Error('CASH_ADVANCE_ALREADY_PROCESSED');

  const User = Meteor.users.findOne({ _id: Deal.userId });

  const activateAt = new Date();

  const set = {
    status: 'active',
    activateAt
  };

  const paymentDate = getPaymentDay(new Date(), User.paymentISODay);

  set['payments'] = GetArrayPayments({
    dealAmount: Deal.amount,
    numberOfPayments: Deal.numberOfPayments,
    feeAmount: Deal.amount * Deal.fee,
    paymentDate,
    isReadjusting: false
  });

  set['feeAmount'] = set.payments.reduce((acc, curr) => $(acc).add(curr.fee).valueOf(), 0);

  const totalAmountToPaid = set.payments.map((p) => $(p.amount).valueOf()).reduce((a, b) => $(a).add(b).valueOf(), 0);

  if (Math.round(totalAmountToPaid) !== Math.round($(Deal.amount).add(set.feeAmount).valueOf())) {
    throw new Meteor.Error('error updating deal');
  }

  set['dateInOverdue'] = addDays(paymentDate, 4);

  const updated = Deals.update({ _id: id }, { $set: set });

  if (!updated) throw new Meteor.Error('error updating deal');

  const userSet = {
    'currentCashAdvance.status': 'active',
    'currentCashAdvance.activateAt': activateAt
  };

  if (!User.paymentISODay) userSet.paymentISODay = getISODay(paymentDate);

  Meteor.users.update(
    { _id: Deal.userId },
    {
      $inc: {
        'metrics.cashAdvances.count': 1,
        'metrics.cashAdvances.totalTaken': Deal.amount
      },
      $set: userSet
    }
  );

  if ([STAGE.SALES.STAGE_8, STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10].includes(User?.offStage?.stage)) {

    if (User?.offStage?.stage === STAGE.SALES.STAGE_8) {
      await changeStage({
        userId: User._id,
        stage: STAGE.UNDERWRITING.STAGE_9
      });
    }

    await changeStatus({
      userId: User._id,
      agentId: by || undefined,
      status: STATUS.ACTIVE_NO_ISSUES
    });
  }

  sendDealTransferProcessedEmail(User, Deal, set);
  Meteor.defer(() => checkIfFirstDealandMarkItAsCustomer(User, Deal));
}

Meteor.methods({
  'deals.process': function _processDeal(id) {
    Security.checkRole(Meteor.userId(), 'super-admin');
    check(id, String);
    processDeal(id, Meteor.userId());
  }
});
