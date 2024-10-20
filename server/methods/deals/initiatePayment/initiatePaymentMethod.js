import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { getHours } from 'date-fns';
import Deals from '../../../collections/deals';
import logger from '../../../logger/log';
import Security from '../../../utils/security';
import Queue from '../../../queue/queue';
import initiatePayment from './initiatePayment';
import * as Sentry from '@sentry/node';

export async function dealInitiatePayment(dealId, paymentNumber) {
  check(dealId, String);
  check(paymentNumber, Number);

  if (!Security.hasRole(Meteor.userId(), ['super-admin'])) {
    if (getHours(new Date()) >= 19) throw new Meteor.Error('Reschedule for the next day.');
  }

  const deal = Deals.findOne({ _id: dealId });
  const payment = deal.payments.find((p) => p.number === paymentNumber);

  try {
    Queue.cancel({
      name: 'initiatePayment',
      'data.dealId': dealId,
      'data.paymentNumber': paymentNumber
    });

    const clearing = { source: 'next-available' };

    await initiatePayment(dealId, paymentNumber, payment.idempotencyKey, Meteor.userId(), false, clearing);
    return { clearing };
  } catch (error) {
    logger.error(`deals.initiatePayment [${dealId}] ${JSON.stringify(error)}`);
    if (error.body && error.body._embedded && error.body._embedded.errors) {
      throw new Meteor.Error(error.body._embedded.errors[0].message);
    }
    Sentry.captureException(error);
    throw error;
  }
}

const method = {
  type: 'method',
  name: 'deals.initiatePayment'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: function initiatePayment(dealId, paymentNumber) {
    Security.checkAccess(Meteor.userId(), ['initiatePayment']);
    dealInitiatePayment(dealId, paymentNumber);
  }
});
