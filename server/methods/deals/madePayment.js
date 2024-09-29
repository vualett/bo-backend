import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Deals from '../../collections/deals';
import { checkIfAllPaymentsPaid } from './utils';
import completeDeal from './completeCashAdvance/completeDeal';
import checkInvitationAndApplyBonus from '../invitations/checkInvitationAndApplyBonus';
import { updateCanShare } from '../users/set/setConfigMethods';
import { checkCanShare } from '../users/verify/checkCanShare';
import { setDateInOverdueInDeal } from './setDateInOverdueDeal';
import { addPaidToODTask } from '../tasks/overdue/addPaidToODTask';
import insertLog from '../logs/insertGenericLog';
import { STAGE, STATUS, SUB_STATUS } from '../../consts/user';
import changeStatus from '../users/changeStatus';
import changeSubStatus from '../users/changeSubStatus';

const LIMIT_CYCLIC_REAPPOINTMENT = 3;

export default async function madePayment(id, paymentNumber, transferUrl, by) {
  check(id, String);
  check(paymentNumber, Number);

  const deal = Deals.findOne({ _id: id });
  const user = Meteor.users.findOne({ _id: deal.userId });
  if (deal && deal.payments) {
    const payment = deal.payments.find((p) => p.number === paymentNumber);

    if (payment) {
      if (!payment.transferUrl && !payment.directDeposit) {
        insertLog(deal.userId, `Payment ${paymentNumber} has no transferUrl or directDeposit`);
        throw new Meteor.Error(`[madePayment] [${id}] [${paymentNumber}]: no have transferUrl or directDeposit `);
      }
    }
  }
  if (!deal) throw new Meteor.Error(`[madePayment] [${id}] [${paymentNumber}]: DEAL_NOT_FOUND`);

  const set = {
    'payments.$.status': 'paid',
    'payments.$.paidAt': new Date(),
    autoRescheduleCount: LIMIT_CYCLIC_REAPPOINTMENT
  };

  if (deal.status === 'closed') set['payments.$.afterWriteOff'] = true;

  const updated = Deals.update(
    {
      _id: id,
      'payments.number': paymentNumber
    },
    {
      $set: set
    }
  );
  if (!updated) throw new Meteor.Error('fail updating deal');

  await setDateInOverdueInDeal(deal._id);

  Meteor.defer(addPaidToODTask.bind(undefined, { user, dealID: deal._id, paymentNumber }));

  // //// TO-DO: MONGO NEEDS TO BE UPDATED AT LEAST TO 3.6 TO FIND A SOLUTION
  // Deals.update(
  //   {
  //     _id: id,
  //     "payments.transfers.transferUrl": transferUrl,
  //   },
  //   {
  //     $set: {
  //       "payments.$.transfers.$.status": "processed",
  //       "payments.$.transfers.$.processedAt": new Date(),
  //     },
  //   }
  // );

  // Set canShare depending on the result of the function checkCanShare
  const updatedDeal = Deals.findOne({ _id: id });
  const clientCanShare = checkCanShare(updatedDeal, user);
  if (user.canShare !== clientCanShare) updateCanShare(updatedDeal.userId, clientCanShare);

  if (checkIfAllPaymentsPaid(deal.payments, paymentNumber)) return completeDeal(id);

  await checkInvitationAndApplyBonus({
    paymentNumber,
    invitedUser: deal.userId,
    deal
  });

  if ([STAGE.UNDERWRITING.STAGE_9, STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10].includes(user?.offStage?.stage)) {

    if (user?.offStage?.status !== STATUS.ACTIVE_NO_ISSUES) {
      await changeStatus({
        userId: user._id,
        agentId: by || undefined,
        status: STATUS.ACTIVE_NO_ISSUES
      });
    }

    await changeSubStatus({
      userId: user._id,
      agentId: by || undefined,
      subStatus: SUB_STATUS.SUCCESSFULL_REMITTANCE
    });
  }

  return true;
}
