import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { parsePhoneNumber } from 'libphonenumber-js';
import Deals from '../../collections/deals';
import logger from '../../logger/log';
import cancelDeal from './cancelCashAdvance';
import sendEmailToAdmin from '../../emails/sendEmailToAdmin';
import updateInteraction from '../users/updateInteraction';
import notifyUser from '../../notifications/notifyUser';
import { NotifyChannel } from '../../notifications/notifyChannel';
import { checkCanShare } from '../users/verify/checkCanShare';
import { updateCanShare } from '../users/set/setConfigMethods';
import { TypeOfIssue } from '../tasks/overdue/createOrUpdateODTask';
import { queueCyclicReappointmentScheduler, queueSendDeclinedPaymentSMS } from '../../queue/queue';
import { SUPPORT_NUMBER } from '../../keys';
import insertLog from '../logs/insertGenericLog';
import { queueCreateOverdueJiraTasks } from '../../../server/queue/queue';

import toOrdinal from '../../utils/toOrdinal';
import { STAGE, STATUS, SUB_STATUS } from '../../consts/user';
import changeStatus from '../users/changeStatus';
import changeSubStatus from '../users/changeSubStatus';

const phoneNumber = parsePhoneNumber(SUPPORT_NUMBER);

async function findAndCancelPendingAdvance(userID) {
  const current = Deals.findOne({
    userId: userID,
    status: { $in: ['requested', 'approved'] }
  });
  try {
    if (!current) return true;
    await cancelDeal(current._id);
    return true;
  } catch (error) {
    logger.error(`[declinePayment -> findAndCancelCashAdvance] Error for user [${userID}]: ${error}`);
    return false;
  }
}

function checkIfOverdue(payments) {
  const declined = payments.filter((p) => p.status === 'declined');
  if (declined.length > 2) return true;
  return false;
}

function checkAndSetOverdueStatus(payments, userId, dealId, status) {
  const declined = payments.filter((p) => p.status === 'declined');
  if (declined.length > 1) {
    updateInteraction({
      userId,
      status,
      by: 'system'
    });
  }
}

export default async function declinePayment(payment) {
  const { id, paymentNumber, returnCode, initiatedAt } = payment;
  check(id, String);
  check(paymentNumber, Number);

  const paymentOverdue3 = { id, status: '', declinedAt: '', returnCode: '', overdueSince: '', number: 0 };

  const deal = Deals.findOne({
    _id: id
  });

  if (!deal) {
    return logger.error(`[declinePayment function] [${id}] [${paymentNumber}]: DEAL_NOT_FOUND`);
  }

  const user = Meteor.users.findOne({
    _id: deal.userId
  });

  insertLog(
    deal.userId,
    `Remittance number ${paymentNumber} initiated on ${initiatedAt} was declined due to code: ${returnCode}`
  );

  // Insert system note if certain returnCode
  if (!['R01', 'R09'].includes(returnCode)) {
    insertLog(deal.userId, `${returnCode} on payment ${paymentNumber}`);
  }

  const { autoRescheduleCount } = deal;

  if (returnCode === 'R01' && autoRescheduleCount > 0) {
    await queueCyclicReappointmentScheduler(deal._id);
  } else {
    await queueCreateOverdueJiraTasks({
      dealID: deal._id,
      paymentNumber,
      returnCode,
      typeOfIssue: TypeOfIssue.TASK
    });
  }

  const set = {
    'payments.$.status': 'declined',
    'payments.$.declinedAt': new Date(),
    'payments.$.returnCode': returnCode
  };

  paymentOverdue3.status = 'declined';
  paymentOverdue3.declinedAt = new Date();
  paymentOverdue3.returnCode = returnCode;

  if (deal.status === 'completed') {
    sendEmailToAdmin(
      `
      CASH ADVANCE: ${id},
      CUSTOMER: https://admin.ualett.com/user/${deal.userId}
      REMITTANCE NUMBER: ${paymentNumber}
      REMITTANCE RETURN CODE: ${returnCode}
      `,
      'Remittance failed for a completed'
    );

    const result = await findAndCancelPendingAdvance(deal.userId);

    if (result) {
      set.status = 'active';
      set.reactivated = new Date();
    }
  }

  if (checkIfOverdue(deal.payments)) {
    set.overdueSince = new Date();
    paymentOverdue3.overdueSince = new Date();
  }

  checkAndSetOverdueStatus(deal.payments, user._id, deal._id, 'overdue');

  paymentOverdue3.number = paymentNumber;

  const update = Deals.update(
    {
      _id: id,
      'payments.number': paymentNumber
    },
    {
      $set: set,
      $addToSet: { 'metrics.returnCodes': returnCode },
      $inc: {
        'payments.$.attempts': 1,
        'metrics.failedPayments': 1
      }
    }
  );
  if (!update) throw new Meteor.Error('failed updating deal');

  // Set canShare depending on the result of the function checkCanShare
  const updatedDeal = Deals.findOne({ _id: id });
  const clientCanShare = checkCanShare(updatedDeal, user);
  if (user.canShare !== clientCanShare) updateCanShare(updatedDeal.userId, clientCanShare);

  Meteor.users.update(
    { _id: deal.userId },
    {
      $set: {
        canShare: false
      },
      $inc: {
        'metrics.failedPayments': 1
      }
    }
  );

  const notifyUserBody = `Oops! Repayment Issue. It looks like your ${toOrdinal(
    paymentNumber
  )} repayment failed. Let's sort it out! Reach out to us at ${phoneNumber} or support@ualett.com to get back on track!`;

  await notifyUser({
    body: notifyUserBody,
    service: 'customerCare',
    userId: user._id,
    channel: NotifyChannel.PUSH,
    to: user.phone.number
  });

  queueSendDeclinedPaymentSMS({ dealId: deal._id, userId: user._id, paymentNumber, notifyUserBody });

  if ([STAGE.UNDERWRITING.STAGE_9, STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10].includes(user?.offStage?.stage)) {
    await changeStatus({
      userId: user._id,
      status: STATUS.ACTIVE_REMITTANCE_FAILED
    });

    let chosenSubStatus = SUB_STATUS.FAILED_IN_OTHER_ACH_ERROR_CODES;

    if (returnCode === 'R01' && deal.autoRescheduleCount > 0) {
      chosenSubStatus = SUB_STATUS.AUTOMATIC_TRUE_UP;
    } else if (returnCode === 'R01' && deal.autoRescheduleCount <= 0) {
      chosenSubStatus = SUB_STATUS.FAILED_ON_R01;
    }

    await changeSubStatus({
      userId: user._id,
      subStatus: chosenSubStatus
    });
  }

  return false;
}
Meteor.methods({ 'deals.declinePayment': declinePayment });
