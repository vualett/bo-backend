/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { addWeeks, getISODay } from 'date-fns';
import Deals from '../../../collections/deals';
import Security from '../../../utils/security';
import reschedulePayment from './reschedulePayment';
import getPaymentDay from '../processDeal/getPaymentDay';
import checkIfNewDatesValid from './checkIfNewDatesValid';
import setPaymentDay from '../../users/set/setPaymentDay';

async function changePaymentsDay(dealID, { firstDate, ISODay }) {
  check(dealID, String);
  Security.checkRole(this.userId, ['super-admin', 'technical', 'admin', 'manager', 'overdue']);

  const cashAdvance = Deals.findOne({ _id: dealID });

  const scheduled = cashAdvance.payments.filter((p) => p.status === 'schedule');

  if (!scheduled.length) {
    throw new Meteor.Error('DONT_HAVE_SCHEDULED_PAYMENTS');
  }

  const oldFirstPaymentDate = scheduled[0].date;

  const firstPaymentDate = firstDate || getPaymentDay(oldFirstPaymentDate, ISODay);

  const newISODay = ISODay || getISODay(firstPaymentDate);

  const oldISODay = oldFirstPaymentDate.getDay();

  if (firstPaymentDate > oldFirstPaymentDate && oldISODay === newISODay) {
    throw new Meteor.Error('CANNOT_BE_SAME_DAY_OF_WEEK');
  }

  const rescheduled = scheduled.map((p, index) => {
    const newDate = addWeeks(firstPaymentDate, index);
    return { ...p, newDate };
  });

  checkIfNewDatesValid(rescheduled.map((p) => p.newDate));

  for (const payment of rescheduled) {
    await reschedulePayment({ dealID, payment, newDate: payment.newDate });
  }
  setPaymentDay(cashAdvance.userId, newISODay);
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.changePaymentsDay'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: changePaymentsDay
});
