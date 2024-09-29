import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';
import Deals from '../../../collections/deals';
import Security from '../../../utils/security';
import Queue from '../../../queue/queue';
import reschedulePayment from './reschedulePayment';
import checkIfNewDatesValid from './checkIfNewDatesValid';

async function reschedulePaymentMethod({ dealID, paymentNumber, newDate }) {
  check(dealID, String);
  check(paymentNumber, Number);
  check(newDate, Date);

  Security.checkRole(this.userId, ['super-admin', 'manager', 'support', 'overdue']);

  const deal = Deals.findOne({ _id: dealID });
  const payment = deal.payments.find((p) => p.number === paymentNumber);
  const user = await Meteor.users.findOne({ _id: deal.userId });

  try {
    checkIfNewDatesValid(payment.date, newDate);

    if (!Security.hasRole(Meteor.userId(), ['super-admin', 'overdue'])) {
      const MAX_ATTEMPTS_EXCLUDED = 5;
      const MAX_ATTEMPTS_DEFAULT = 3;
      const EXCLUDED_CATEGORIES = ['a+', '2kw14', '2k', 'xl', '2k+'];

      const maxAttempts = EXCLUDED_CATEGORIES.includes(user.category) ? MAX_ATTEMPTS_EXCLUDED : MAX_ATTEMPTS_DEFAULT;

      if ((payment.attempts || 0) >= maxAttempts) {
        throw new Meteor.Error(`MAX_ATTEMPTS_REACHED: ${maxAttempts}`);
      }
    }

    Queue.cancel({
      name: 'initiatePayment',
      'data.dealId': dealID,
      'data.paymentNumber': paymentNumber
    });

    Queue.cancel({
      name: 'cyclicReappointmentScheduler',
      'data.dealId': dealID
    });

    await reschedulePayment({
      dealID: deal._id,
      payment,
      newDate,
      rescheduledBy: Meteor.userId(),
      doMetric: true
    });

    if (payment.status !== 'declined') {
      Meteor.users.update(
        { _id: deal.userId },
        {
          $inc: {
            'metrics.rescheduledPayments': 1
          }
        }
      );
    }
  } catch (error) {
    logger.error(`deals.reschedulePayment [${dealID}] ${JSON.stringify(error)}`);
    Sentry.captureException(error);
    throw error;
  }
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.reschedulePayment'
};

DDPRateLimiter.addRule(method, 1, 500);

Meteor.methods({
  [method.name]: reschedulePaymentMethod
});
