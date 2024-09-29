import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { endOfDay, format, differenceInWeeks } from 'date-fns';
import Security from '../../utils/security';
import Deals from '../../collections/deals';
import getTotalAmountArray from '../../utils/getTotalAmountArray';
import { daysInArreas } from '../deals/utils';

export async function getAgingDBData(endDate) {
  const lessThanEqualDate = endOfDay(endDate);

  const pipeline = [
    {
      $match: {
        activateAt: {
          $lte: lessThanEqualDate
        },
        status: { $in: ['active', 'completed'] },
        accountingStatus: { $ne: 'deal_refunded' },
        writeOffAt: { $exists: false }
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
        paymentDates: {
          $map: {
            input: '$payments',
            as: 'payment',
            in: '$$payment.paidAt'
          }
        }
      }
    },
    {
      $addFields: {
        lastPaymentDate: {
          $max: '$paymentDates'
        },
        paymentsTermsModified: {
          $cond: {
            if: {
              $gt: [
                {
                  $size: '$payments'
                },
                '$numberOfPayments'
              ]
            },
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        amount: 1,
        feeAmount: 1,
        payments: 1,
        activateAt: 1,
        lastPaymentDate: 1,
        paymentsTermsModified: 1,
        userId: 1
      }
    }
  ];

  const deals = await Deals.rawCollection().aggregate(pipeline).toArray();

  return deals;
}

export function process(data, endDate) {
  const newData = data
    .map(({ payments, ...rest }) => {
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

      const unpaidPayments = newPayments
        .filter((p) => p.status !== 'paid')
        .map((payment) => ({
          ...payment,
          weeksBehind: differenceInWeeks(new Date(endDate), new Date(payment.originalDate || payment.date))
        }));

      if (unpaidPayments.length === 0) return false;

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
        daysInArreas: daysInArreas({ payments }),
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
        totalFeeInArrears
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

Meteor.methods({
  'reports.aging2.getRawData': async function makeReportMethod(endDate) {
    this.unblock();
    check(endDate, String);
    Security.checkIfAdmin(this.userId);
    const _endDate = endOfDay(new Date(endDate));

    const data = await getAgingDBData(_endDate);

    const dataProcessed = process(data, _endDate);

    const {
      date,
      currentAmount,
      allInArrearsAmount,
      oneWeekAmount,
      twoWeeksAmount,
      threeWeeksAmount,
      fourWeeksAmount,
      fiveOrMoreWeeksAmount
    } = dataProcessed;

    return {
      date,
      currentAmount,
      allInArrearsAmount,
      oneWeekAmount,
      twoWeeksAmount,
      threeWeeksAmount,
      fourWeeksAmount,
      fiveOrMoreWeeksAmount
    };
  }
});

const method = {
  type: 'method',
  name: 'reports.aging2.getRawData'
};

DDPRateLimiter.addRule(method, 1, 3000);

export default {};
