import { startOfDay, addWeeks, isPast, differenceInWeeks } from 'date-fns/';
import { Meteor } from 'meteor/meteor';
import Deals from '../../../collections/deals';
import groupByMonth from './groupByMonth';

export default async function getAgingDBData(dates) {
  if (!dates) return false;

  const startDate = new Date(dates.start);
  const endDate = new Date(dates.end);

  const pipeline = [
    {
      $match: {
        activateAt: {
          $gte: startOfDay(startDate),
          $lt: startOfDay(endDate)
        },
        status: { $in: ['active', 'suspended'] }
      }
    },

    {
      $addFields: {
        feeAmount: { $multiply: ['$amount', '$fee'] }
      }
    },

    {
      $addFields: {
        feeAmountPerPymnt: { $divide: ['$feeAmount', '$numberOfPayments'] },
        'payments.feeAmountPerPymnt': { $divide: ['$feeAmount', '$numberOfPayments'] }
      }
    },
    {
      $lookup: {
        from: Meteor.users._name,
        localField: 'userId',
        foreignField: '_id',
        as: 'customer'
      }
    },
    {
      $addFields: {
        customer: { $arrayElemAt: ['$customer', 0] }
      }
    }
  ];

  const deals = await Deals.rawCollection().aggregate(pipeline).toArray();

  const dealsMapped = deals.map(({ payments, ...rest }) => {
    // workarround req
    const dealsEstimatedEndDate = addWeeks(rest.activateAt, rest.numberOfPayments + 2);

    const paidPayments = payments.filter((p) => p.status === 'paid');

    const currentPayments = payments
      .filter((p) => p.status !== 'paid')
      .filter((p) => new Date(p.originalDate || p.date) >= startOfDay(new Date()))
      .filter((p) => new Date(p.originalDate || p.date) <= new Date(dealsEstimatedEndDate));

    const filteredOverduePayments = payments
      .filter((p) => p.status !== 'paid' && p.status !== 'pending')
      .filter((p) => isPast(new Date(p.originalDate || p.date)));

    // workarround
    const filteredOverduePayments2 = payments
      .filter((p) => p.status !== 'paid')
      .filter((p) => !isPast(new Date(p.originalDate || p.date)))
      .filter((p) => new Date(p.originalDate || p.date) >= new Date(dealsEstimatedEndDate));

    const toMap = [...filteredOverduePayments, ...filteredOverduePayments2];
    // end workarround

    const overduePayments = toMap
      .map((p) => ({
        ...p,
        weeksBehind: differenceInWeeks(new Date(), new Date(p.originalDate || p.date))
      }))
      .map((p) => {
        const date = p.date || p.originalDate;

        // workarround
        let newWeeksBehind = p.weeksBehind;

        if (new Date(date) > new Date(dealsEstimatedEndDate) && p.weeksBehind < 3) {
          newWeeksBehind = differenceInWeeks(new Date(), dealsEstimatedEndDate);
        }
        // end workarround

        let principal = p.amount - p.feeAmountPerPymnt;
        let fee = p.feeAmountPerPymnt;

        if (p.bonus) {
          if (p.bonus <= p.feeAmountPerPymnt) {
            fee = p.feeAmountPerPymnt - p.bonus;
            principal = p.amount - p.feeAmountPerPymnt;
          } else {
            fee = 0;
            principal = p.amount;
          }
        }

        return { ...p, principal, fee, date, weeksBehind: newWeeksBehind };
      })
      .sort((a, b) => b.weeksBehind - a.weeksBehind);

    const olderPayment = overduePayments[0];
    const olderPaymentAge = overduePayments.length > 0 ? olderPayment.weeksBehind : 0;

    const pendingCapital = overduePayments.map((p) => p.principal).reduce((a, b) => a + b, 0);
    const pendingAmount = overduePayments.map((p) => p.amount).reduce((a, b) => a + b, 0);
    const paidAmount = paidPayments.map((p) => p.amount).reduce((a, b) => a + b, 0);

    return {
      ...rest,
      overduePayments,
      currentPayments,
      olderPayment,
      olderPaymentAge,
      pendingCapital,
      pendingAmount,
      paidAmount
    };
  });

  const grouped = groupByMonth(dealsMapped, 'activateAt');

  return grouped;
}
