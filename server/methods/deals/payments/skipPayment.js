import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Deals from '../../../collections/deals';
import logger from '../../../logger/log';
import Security from '../../../utils/security';
import * as Sentry from '@sentry/node';

async function skipPayment({ dealID, paymentNumber }) {
  check(dealID, String);
  check(paymentNumber, Number);
  Security.checkIfAdmin(Meteor.userId());

  const deal = Deals.findOne({ _id: dealID });
  const { userId, payments } = deal;
  const payment = payments.find((p) => p.number === paymentNumber);

  if (payment.status !== 'schedule') return false;

  const set = {
    'payments.$.skip': true
  };

  try {
    if (Deals.update({ _id: dealID, 'payments.number': paymentNumber }, { $set: set })) {
      Meteor.call(
        'notes.insert',
        {
          message: `REMITTANCE ${paymentNumber} SKIPED`,
          where: 'user',
          userId
        },
        true
      );
      return true;
    }
    return false;
  } catch (e) {
    Sentry.captureException(e);
    logger.error(`[${deal.userId}] ${JSON.stringify(e)}`);
    throw e;
  }
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.skipPayment'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: skipPayment
});
