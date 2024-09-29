/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import addWeeks from 'date-fns/addWeeks';
import Deals from '../../../collections/deals';
import Security from '../../../utils/security';
import reschedulePayment from './reschedulePayment';
import checkIfNewDatesValid from './checkIfNewDatesValid';
import startOfDay from 'date-fns/startOfDay';
import { queueClearBatchRescheduleHold } from '../../../queue/queue';
import insertLog from '../../logs/insertGenericLog';
import { orderPayments } from './orderPayments';

function checkIfHavePendingPayments(payments) {
  const pending = payments.filter((p) => p.status === 'pending');
  if (pending.length >= 1) return true;
  return false;
}
export default async function batchReschedule(dealID, R01, fromAutoReschedule) {
  check(dealID, String);
  const query = { _id: dealID };

  const cashAdvance = Deals.findOne(query);
  if (!cashAdvance) throw new Meteor.Error('DEAL NOT FOUND');
  if (checkIfHavePendingPayments(cashAdvance.payments) === true) {
    throw new Meteor.Error('PENDING PAYMENTS');
  }
  const scheduled =
    R01 && fromAutoReschedule
      ? cashAdvance.payments.filter((p) => p.status === 'declined' && p.returnCode === 'R01')
      : R01
      ? cashAdvance.payments.filter(
          (p) => p.status === 'schedule' || (p.status === 'declined' && p.returnCode === 'R01')
        )
      : cashAdvance.payments.filter((p) => p.status === 'schedule');

  const lastPaymentDate = cashAdvance.payments
    .slice()
    .sort((a, b) => new Date(a.date).valueOf() - new Date(b.date).valueOf())
    .pop().date;

  const rescheduled = scheduled.map((p, index) => ({
    ...p,
    newDate: addWeeks(
      fromAutoReschedule ? lastPaymentDate : p.date,
      fromAutoReschedule ? index + (cashAdvance.isBiweekly ? 2 : 1) : 1
    )
  }));

  checkIfNewDatesValid(rescheduled.map((p) => p.newDate));

  const updateDeal = {
    $inc: {
      'metrics.batchReschedule': 1,
      ...(fromAutoReschedule ? { autoRescheduleCount: -1 } : {})
    }
  };

  Deals.update(query, updateDeal);

  // parte de una funcionalidad incompleta para que el usuario no pueda re-agendar mas de una vez por semana
  // TO-DO: evaluar funcionalidad y comprobar funcionalidad
  const updateOptions = {
    $set: {
      rescheduleHold: startOfDay(addWeeks(new Date(), 1))
    }
  };

  Meteor.users.update({ _id: cashAdvance.userId }, updateOptions);

  await queueClearBatchRescheduleHold({ userId: cashAdvance.userId });

  for (const payment of rescheduled) {
    await reschedulePayment({ dealID, payment, newDate: payment.newDate });
  }

  if (fromAutoReschedule) {
    await orderPayments(dealID);
    Meteor.defer(
      insertLog.bind(
        undefined,
        cashAdvance.userId,
        `Cyclical Reschedule Done | ${cashAdvance.autoRescheduleCount - 1} more Left!`
      )
    );
  }
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.batchReschedule'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: async function batchRescheduleMethod(dealID) {
    Security.checkAccess(this.userId, ['reschedule']);
    await batchReschedule(dealID);
  }
});
