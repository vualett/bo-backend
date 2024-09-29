import { Meteor } from 'meteor/meteor';
import {
  format,
  endOfDay,
  differenceInCalendarDays,
  differenceInWeeks,
  differenceInDays,
  addWeeks,
  addDays
} from 'date-fns/';
import max from 'date-fns/max';
import Deals from '../../../collections/deals';

export default async function getDataTape(dates) {
  if (!dates) return false;

  const startDate = new Date(dates.start);
  const endDate = endOfDay(new Date(dates.end));

  const pipeline = [
    {
      $match: {
        activateAt: { $gte: startDate, $lte: endDate },
        status: { $in: ['active', 'suspended', 'completed'] }
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
      $project: {
        amount: 1,
        status: 1,
        activateAt: 1,
        payments: 1,
        fee: 1,
        numberOfPayments: 1,
        completeAt: 1,
        'customer.address.state': 1,
        'customer.category': 1,
        'customer.metrics.cashAdvances.count': 1
      }
    }
    // { $match: { status: 'completed' } },
    // { $sort: { completeAt: -1 } },
    // { $limit: 10000 },
  ];

  const CAs = await Deals.rawCollection().aggregate(pipeline).toArray();

  const mapped = CAs.filter((d) => d.payments[0].amount !== d.amount)
    .filter((d) => d.amount <= 3000)
    .filter((d) => d.amount !== d.payments[0].amount)
    .map((d) => {
      const totalPaid = d.payments
        .filter((p) => p.status === 'paid')
        .map((p) => p.amount)
        .reduce((a, b) => a + b, 0);

      const feeAmount = d.amount * d.fee;

      const totalAmountandFee = d.amount + feeAmount;

      const _CUSTOMERTYPE = (() => {
        if (
          d.customer[0].metrics &&
          d.customer[0].metrics.cashAdvances &&
          d.customer[0].metrics.cashAdvances.count > 0
        ) {
          return 'Returning';
        }
        return 'New';
      })();

      const _GRADE = (() => {
        if (d.customer[0].category === 'a+') return 'a+';
        if (d.customer[0].category === 'a') return 'a';
        if (d.customer[0].category === 'b') return 'b';
        return 'c';
      })();

      const _PRINCIPAL_OUTSTANDING = totalPaid > d.amount ? 0 : d.amount - totalPaid;

      const lastPaymentScheduleDate = max.apply(
        this,
        d.payments.map((p) => p.date)
      );

      const _lastPaymentsPaidDate = (() => {
        const paymentsPaid = d.payments.filter((p) => p.status === 'paid' && p.paidAt);

        if (paymentsPaid.length === 0) return false;

        const lastPaymentPaidDate = max.apply(
          this,
          paymentsPaid.map((p) => new Date(p.paidAt))
        );
        return lastPaymentPaidDate;
      })();

      function getLastPaymentDate() {
        if (!_lastPaymentsPaidDate) return lastPaymentScheduleDate;

        return max(_lastPaymentsPaidDate, lastPaymentScheduleDate);
      }

      const DEFAULTED_DATE = (() => addDays(getLastPaymentDate(), 190))();

      const _DAYS_PAST_DUE = (() => {
        const estimatedEndDate = addWeeks(getLastPaymentDate(), 1);

        const diff = differenceInCalendarDays(new Date(), estimatedEndDate);

        if (diff > 0) {
          return diff;
        }

        return 0;
      })();

      const avgLagRepayments = (() => {
        const paymentsPaid = d.payments.filter((p) => p.status === 'paid' && p.paidAt);

        if (paymentsPaid.length === 0) return 0;

        const lagInDaysMap = paymentsPaid.map((p) => {
          if (p.declinedAt) return differenceInDays(p.paidAt, p.declinedAt);
          return differenceInDays(p.paidAt, p.date);
        });

        let total = 0;
        for (let i = 0; i < lagInDaysMap.length; i += 1) {
          total += lagInDaysMap[i];
        }
        const avg = total / lagInDaysMap.length;

        return Math.round(avg);
      })();

      const _prepayment = (() => {
        if (d.status !== 'completed') return false;
        if (!_lastPaymentsPaidDate) return false;

        const estimatedEndDate = addWeeks(d.activateAt, d.numberOfPayments);

        if (differenceInWeeks(_lastPaymentsPaidDate, estimatedEndDate) < 0) {
          const paymentsPaid = d.payments.filter((p) => p.status === 'paid' && p.paidAt);

          const prepaidPayments = paymentsPaid
            .filter((p) => differenceInDays(p.paidAt, p.originalDate || p.date) < 0)
            .map((p) => p.amount)
            .reduce((a, b) => a + b, 0);
          if (prepaidPayments <= 0) return false;
          return { amount: prepaidPayments, date: _lastPaymentsPaidDate };
        }

        return false;
      })();

      const _STATUS = (() => {
        if (d.status === 'completed') return 'paid';

        if (d.status === 'active' && _DAYS_PAST_DUE > 190) {
          if (totalPaid >= d.amount / 2) return 'active-negotiation';

          return 'negotiation-defaulted';
        }

        if (d.status === 'suspended') {
          if (differenceInCalendarDays(new Date(), addWeeks(d.activateAt, d.numberOfPayments + 2)) > 190) {
            return 'defaulted';
          }
        }

        return 'active';
      })();

      // const _TIME_TAKEN_TO_PAY = (() => (_STATUS === 'paid'
      //   ? differenceInWeeks(d.completeAt, d.activateAt)
      //   : ''))();

      return {
        ID: d._id,
        AMOUNT: d.amount,
        STATUS: _STATUS,
        ORIGINATION_DATE: d.activateAt,
        TERM: d.numberOfPayments,
        FEE: d.fee,
        FEE_AMOUNT: d.amount * d.fee,
        PAYMENTS_AMOUNT: d.payments[0].amount,
        CUSTOMER_STATE: d.customer[0].address ? d.customer[0].address.state : 'N/A',
        CUSTOMER_TYPE: _CUSTOMERTYPE,
        CUSTOMER_GRADE: _GRADE.toUpperCase(),
        PRINCIPAL_OUTSTANDING: _PRINCIPAL_OUTSTANDING,
        TOTAL_OUTSTANDING: totalPaid > totalAmountandFee ? null : totalAmountandFee - totalPaid,
        TOTAL_AMOUNT_RECEIVED: totalPaid,
        PREPAYMENT_DATE: _prepayment ? format(_prepayment.date, 'MM/DD/YYYY') : '',
        PREPAYMENT_AMOUNT: _prepayment ? _prepayment.amount : null,
        // LAST_PAYMENT_MADE_DATE: _lastPaymentsPaidDate ? format(_lastPaymentsPaidDate, "MM/DD/YYYY") : "",
        // DEFAULTED_DATE: ["defaulted", "negotiation"].includes(_STATUS) ? format(DEFAULTED_DATE, "MM/DD/YYYY") : "",
        DAYS_PAST_DUE: (() => {
          if (_STATUS === 'paid') return null;
          if (_DAYS_PAST_DUE > 0) return _DAYS_PAST_DUE;
          return null;
        })()
        // avgLagRepayments,
      };
    });

  // return mapped.filter(deals => deals.STATUS === "defaulted" && deals._DAYS_PAST_DUE > 190);
  return mapped;
}
