import getPaymentDay from '../processDeal/getPaymentDay';
import { addWeeks } from 'date-fns';
import differenceInWeeks from 'date-fns/differenceInWeeks';
import { Meteor } from 'meteor/meteor';

import add from 'date-fns/add';
import max from 'date-fns/max';
export default async function isPastedFourWeeks(deal) {
  const User = Meteor.users.findOne({ _id: deal.userId });

  const paymentDate = getPaymentDay(deal.createdAt, User.paymentISODay);

  const array = [];

  for (let i = 0; i < deal.numberOfPayments; i += 1) {
    const obj = {
      date: addWeeks(paymentDate, i)
    };
    array.push(obj);
  }

  const lasDayForPayment = array[array.length - 1];

  const weeksDefault = differenceInWeeks(
    add(new Date(Object.values(lasDayForPayment)), { days: 4 }),
    new Date(deal.createdAt)
  );

  const paymentPaidDates = deal?.payments.filter((payment) => payment.paidAt).map((payment) => payment.paidAt);
  const lastPaymentPaidDate = max(paymentPaidDates);

  const weeksPaid = differenceInWeeks(new Date(add(lastPaymentPaidDate, { days: 4 })), new Date(deal.createdAt));

  if (weeksPaid > weeksDefault + 5) {
    return { status: true, message: 'WeeksPaid is greater than 5' };
  } else if (weeksPaid === weeksDefault + 5) {
    return { status: true, message: 'WeeksPaid is equal 5' };
  } else if (weeksPaid > weeksDefault + 3) {
    return { status: true, message: 'WeeksPaid is greater than 3' };
  }

  return { status: false, message: 'WeeksPaid is correct' };
}
