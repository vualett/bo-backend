import { Meteor } from 'meteor/meteor';
import Deals from '../../../server/collections/deals';
import Security from '../../../server/utils/security';
import logger from '../../../server/logger/log';
import * as Sentry from '@sentry/node';
import Dwolla from '../../../server/dwolla/dwolla';
import { ENV, SUPPORT_NUMBER } from '../../../server/keys';
import { queueCyclicReappointmentScheduler, queueSendDeclinedPaymentSMS } from '../../../server/queue/queue';
import notifyUser from '../../../server/notifications/notifyUser';
import { NotifyChannel } from '../../../server/notifications/notifyChannel';
import { parsePhoneNumber } from 'libphonenumber-js';
import { check } from 'meteor/check';
import { insertNote } from '../../../server/methods/notes';
import toOrdinal from '../../../server/utils/toOrdinal';
import { STATUS, STAGE, SUB_STATUS } from '../../../server/consts/user';
import changeStatus from '../../../server/methods/users/changeStatus';
import changeSubStatus from '../../../server/methods/users/changeSubStatus';

const phoneNumber = parsePhoneNumber(SUPPORT_NUMBER);

// this method sends a request to dwolla to decline a pending transaction.
async function declineTransfer(fundingSourceUrl, errorCode) {
  const requestBody = {
    name: errorCode
  };

  return Dwolla()
    .post(fundingSourceUrl, requestBody)
    .then((res) => res.body.name);
}

async function declinePayment(userID, dealID, paymentNumber) {
  this.unblock();
  Security.checkIfAdmin(Meteor.userId());

  try {
    const deal = Deals.findOne({ _id: dealID });

    if (!deal) throw new Meteor.Error('DEAL_NOT_FOUND');

    if (deal.status !== 'active') throw new Meteor.Error('DEAL_STATUS_NOT_ACTIVE');

    const payment = deal.payments.filter((p) => p.number === paymentNumber)[0];

    if (payment.status !== 'pending') throw new Meteor.Error('PAYMENT_STATUS_NOT_PENDING');

    const user = Meteor.users.findOne({ _id: deal.userId });

    const ERROR_CODE = 'R04'; // YOU CAN CHANGE THE ERROR CODE FOR TESTING

    const transfer = await declineTransfer(user.dwollaFundingURL, ERROR_CODE);

    if (!transfer) throw new Meteor.Error('ERROR_TRANSFER');

    insertNote({
      message: `Remittance number ${paymentNumber} initiated on ${payment.initiatedAt} was declined due to code: ${ERROR_CODE}`,
      where: 'user',
      userId: deal.userId,
      by: 'system'
    });

    if (ERROR_CODE === 'R01' && deal.autoRescheduleCount > 0) {
      await queueCyclicReappointmentScheduler(deal._id);
    }

    if (ENV === 'development' || ENV === 'sandbox' || ENV === 'dev') {
      const set = {
        'payments.$.status': 'declined',
        'payments.$.declinedAt': new Date(),
        'payments.$.returnCode': ERROR_CODE
      };

      Deals.update(
        {
          _id: dealID,
          'payments.number': paymentNumber
        },
        {
          $set: set,
          $addToSet: { 'metrics.returnCodes': ERROR_CODE },
          $inc: {
            'payments.$.attempts': 1,
            'metrics.failedPayments': 1
          }
        }
      );

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
    }
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

      if (ERROR_CODE === 'R01' && deal.autoRescheduleCount > 0) {
        chosenSubStatus = SUB_STATUS.AUTOMATIC_TRUE_UP;
      } else if (ERROR_CODE === 'R01' && deal.autoRescheduleCount <= 0) {
        chosenSubStatus = SUB_STATUS.FAILED_ON_R01;
      }

      await changeSubStatus({
        userId: user._id,
        subStatus: chosenSubStatus
      });
    }
  } catch (error) {
    logger.error(`_dev.users.declinePayment[${userID}]${error}`);
    Sentry.captureException(error, { extra: userID });
    return false;
  }
}

Meteor.methods({
  '_dev.users.declinePayment': declinePayment,
  '_dev.users.declineTransaction': async function _declineTransaction(fundingUrl, errorCode) {
    check(fundingUrl, String);
    check(errorCode, String);
    Security.checkIfAdmin(Meteor.userId());

    return await declineTransfer(fundingUrl, errorCode);
  }
});
