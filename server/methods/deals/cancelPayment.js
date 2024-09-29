import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Deals from '../../collections/deals';
import cancelTransfer from '../../dwolla/cancelTransfer';
import logger from '../../logger/log';
import reschedulePayment from './reschedulePayments/reschedulePayment';
import Security from '../../utils/security';
import * as Sentry from '@sentry/node';
export async function cancelPayment({ dealID, paymentNumber, newDate }) {
  check(dealID, String);
  check(paymentNumber, Number);
  check(newDate, Date);

  const deal = Deals.findOne({ _id: dealID });
  const payment = deal.payments.find((p) => p.number === paymentNumber);
  try {
    const result = await cancelTransfer(payment.transferUrl);
    await reschedulePayment({
      dealID,
      payment,
      newDate,
      rescheduledBy: Meteor.userId(),
      doMetric: true
    });
    Meteor.users.update(
      { _id: deal.userId },
      {
        $inc: {
          'metrics.rescheduledPayments': 1
        }
      }
    );
    return result;
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`deals.cancelPayment[${dealID}] ${JSON.stringify(error)}`);
    throw error;
  }
}

Meteor.methods({
  'deals.cancelPayment': async function cancelPaymentMethod({ dealID, paymentNumber, newDate }) {
    Security.checkIfAdmin(this.userId);
    return cancelPayment({ dealID, paymentNumber, newDate });
  }
});
