import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';
import Deals from '../../collections/deals';
import logger from '../../logger/log';
import { insertDataChangesLog } from '../../dataChangesLogs';
import * as Sentry from '@sentry/node';
export default async function reverseAndCancelDeal(id) {
  check(id, String);
  Security.checkRole(Meteor.userId(), ['super-admin', 'technical']);

  const deal = Deals.findOne({ _id: id });
  if (!deal) throw new Meteor.Error('NOT_FOUND');

  if (deal.status !== 'active') throw new Meteor.Error('NON_ACTIVE');
  const paymentsNotScheduled = deal.payments.filter((p) => p.transferURL || p.status !== 'schedule');

  if (paymentsNotScheduled.length >= 0) throw new Meteor.Error('NOT_VALID_PYMNTS_ARRAY');

  try {
    const newPaymentsArray = [
      {
        status: 'schedule',
        number: 1,
        date: new Date(),
        amount: deal.amount,
        idempotencyKey: Random.id()
      }
    ];

    insertDataChangesLog({
      where: 'deals',
      documentID: id,
      operation: 'update',
      method: 'readjustPayments',
      createdBy: Meteor.userId(),
      old_data: deal.payments,
      new_data: newPaymentsArray
    });

    await Meteor.users.update(
      { _id: deal.userId },
      {
        $set: {
          payments: newPaymentsArray
        }
      }
    );
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`deals.reverseAndCancel [${id}] ${JSON.stringify(error)}`);
    throw new Meteor.Error(error);
  }
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.reverseAndCancel'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: reverseAndCancelDeal
});
