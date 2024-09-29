import { Meteor } from 'meteor/meteor';
import { endOfDay, format, differenceInWeeks } from 'date-fns';
// import Security from "../../../utils/security";
import Deals from '../../../collections/deals';
import getTotalAmountArray from '../../../utils/getTotalAmountArray';

export async function getAgingDBData(endDate) {
  const start = endOfDay(new Date('2019-12-31'));
  const end = endOfDay(new Date('2020-12-31'));

  const pipeline = [
    {
      $match: {
        activateAt: {
          $gt: start,
          $lte: end
        },
        status: { $in: ['active', 'completed', 'closed'] },
        accountingStatus: { $ne: 'deal_refunded' }
      }
    },
    {
      $addFields: {
        feeAmount: {
          $ifNull: [
            '$feeAmount',
            {
              $multiply: ['$amount', '$fee']
            }
          ]
        }
      }
    },
    {
      $addFields: {
        feeAmountPerPymnt: { $divide: ['$feeAmount', '$numberOfPayments'] },
        'payments.feeAmountPerPymnt': {
          $divide: ['$feeAmount', '$numberOfPayments']
        }
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
    },
    {
      $project: {
        status: 1,
        amount: 1,
        feeAmount: 1,
        payments: 1,
        activateAt: 1,
        'customer._id': 1,
        'customer.firstName': 1,
        'customer.lastName': 1
      }
    }
  ];

  const deals = await Deals.rawCollection().aggregate(pipeline).toArray();

  return deals;
}

export function process(data, endDate) {
  const newData = data
    .map(({ payments, status, ...rest }) => {
      let currentSituation = 'ACTIVE';

      const newPayments = payments.map((p) => {
        const newPayment = p;

        if (p.status === 'paid') {
          if (p.paidAt && new Date(p.paidAt) >= new Date(endDate)) {
            newPayment.status = 'schedule';
            delete newPayment.paidAt;
          }
        }

        return newPayment;
      });

      let unpaidPayments = newPayments
        .filter((p) => p.status !== 'paid')
        .map((payment) => ({
          ...payment,
          weeksBehind: differenceInWeeks(new Date(endDate), new Date(payment.originalDate || payment.date))
        }));

      if (status === 'paid') unpaidPayments = [];

      if (unpaidPayments.length === 0) currentSituation = 'PAID_IN_FULL';
      if (status === 'closed') currentSituation = 'WRITTEN_OFF';

      const current = unpaidPayments.filter((p) => p.weeksBehind <= 1);

      const oneWeek = unpaidPayments.filter((p) => p.weeksBehind === 2);
      const twoWeeks = unpaidPayments.filter((p) => p.weeksBehind === 3);
      const threeWeeks = unpaidPayments.filter((p) => p.weeksBehind === 4);
      const fourWeeks = unpaidPayments.filter((p) => p.weeksBehind === 5);
      const fiveOrMoreWeeks = unpaidPayments.filter((p) => p.weeksBehind >= 6);

      const currentAmount = getTotalAmountArray(current, 'amount');
      const currentPrincipalAmount = getTotalAmountArray(current, 'principal');
      const currentFeeAmount = getTotalAmountArray(current, 'fee');

      const oneWeekAmount = getTotalAmountArray(oneWeek, 'amount');
      const oneWeekPrincipalAmount = getTotalAmountArray(oneWeek, 'principal');
      const oneWeekFeeAmount = getTotalAmountArray(oneWeek, 'fee');

      const twoWeeksAmount = getTotalAmountArray(twoWeeks, 'amount');
      const twoWeeksPrincipalAmount = getTotalAmountArray(twoWeeks, 'principal');
      const twoWeeksFeeAmount = getTotalAmountArray(twoWeeks, 'fee');

      const threeWeeksAmount = getTotalAmountArray(threeWeeks, 'amount');
      const threeWeeksPrincipalAmount = getTotalAmountArray(threeWeeks, 'principal');
      const threeWeeksFeeAmount = getTotalAmountArray(threeWeeks, 'fee');

      const fourWeeksAmount = getTotalAmountArray(fourWeeks, 'amount');
      const fourWeeksPrincipalAmount = getTotalAmountArray(fourWeeks, 'principal');
      const fourWeeksFeeAmount = getTotalAmountArray(fourWeeks, 'fee');

      const fiveOrMoreWeeksAmount = getTotalAmountArray(fiveOrMoreWeeks, 'amount');
      const fiveOrMoreWeeksPrincipalAmount = getTotalAmountArray(fiveOrMoreWeeks, 'principal');
      const fiveOrMoreWeeksFeeAmount = getTotalAmountArray(fiveOrMoreWeeks, 'fee');

      const totalInArrears =
        oneWeekAmount + twoWeeksAmount + threeWeeksAmount + fourWeeksAmount + fiveOrMoreWeeksAmount;
      const totalPrincipalInArrears =
        oneWeekPrincipalAmount +
        twoWeeksPrincipalAmount +
        threeWeeksPrincipalAmount +
        fourWeeksPrincipalAmount +
        fiveOrMoreWeeksPrincipalAmount;
      const totalFeeInArrears =
        oneWeekFeeAmount + twoWeeksFeeAmount + threeWeeksFeeAmount + fourWeeksFeeAmount + fiveOrMoreWeeksFeeAmount;

      return {
        ...rest,
        actualPayments: payments,
        payments: newPayments,
        currentPayments: current,
        currentAmount,
        currentPrincipalAmount,
        currentFeeAmount,
        oneWeekAmount,
        oneWeekPrincipalAmount,
        oneWeekFeeAmount,
        twoWeeksAmount,
        twoWeeksPrincipalAmount,
        twoWeeksFeeAmount,
        threeWeeksAmount,
        threeWeeksPrincipalAmount,
        threeWeeksFeeAmount,
        fourWeeksAmount,
        fourWeeksPrincipalAmount,
        fourWeeksFeeAmount,
        fiveOrMoreWeeksAmount,
        fiveOrMoreWeeksPrincipalAmount,
        fiveOrMoreWeeksFeeAmount,
        totalInArrears,
        totalPrincipalInArrears,
        totalFeeInArrears,
        currentSituation
      };
    })
    .filter((d) => d);

  const allCurrentPayments = [];

  newData.forEach((d) => {
    allCurrentPayments.push(...d.currentPayments);
  });

  const currentAmount = getTotalAmountArray(allCurrentPayments, 'amount');
  const allInArrearsAmount = getTotalAmountArray(newData, 'totalInArrears');

  const oneWeekAmount = getTotalAmountArray(newData, 'oneWeekAmount');
  const twoWeeksAmount = getTotalAmountArray(newData, 'twoWeeksAmount');
  const threeWeeksAmount = getTotalAmountArray(newData, 'threeWeeksAmount');
  const fourWeeksAmount = getTotalAmountArray(newData, 'fourWeeksAmount');
  const fiveOrMoreWeeksAmount = getTotalAmountArray(newData, 'fiveOrMoreWeeksAmount');

  // cleanup to send to client
  delete newData.actualPayments;
  delete newData.payments;
  delete newData.currentPayments;

  return {
    date: format(endDate, 'MM/dd/yyyy'),
    deals: newData,
    currentAmount,
    allInArrearsAmount,
    oneWeekAmount,
    twoWeeksAmount,
    threeWeeksAmount,
    fourWeeksAmount,
    fiveOrMoreWeeksAmount
  };
}

export default {};
