import { Meteor } from 'meteor/meteor';
import { endOfDay, getMonth, format } from 'date-fns';
import Deals from '../../collections/deals';
import { flatten } from '../../utils/utils';
import Security from '../../utils/security';
import checkIfPaymentProcessed from '../deals/checkIfPaymentProcessed';

function process(data, dates) {
  const paidPayments = data.filter((p) => p.status === 'paid');
  const pendingPayments = data.filter((p) => p.status === 'pending');

  const processedAfter = {
    count: 0,
    amount: 0,
    fee: 0,
    month: ''
  };

  if (getMonth(dates.start) === getMonth(dates.end)) {
    const processed = data.filter(({ status }) => status === 'paid');
    const currentMonth = getMonth(dates.startDate);
    const processedAfterData = processed.filter((p) => getMonth(p.paidAt) !== currentMonth);

    if (processedAfterData.length > 0) {
      processedAfter.count = processedAfterData.length;
      processedAfter.amount = processedAfterData.map((p) => p.amount).reduce((a, b) => a + b, 0);
      processedAfter.fee = processedAfter.amount * 0.189;
      processedAfter.month = format(processedAfterData[0].paidAt, 'MMM');
    }
  }

  const all = {
    count: data.length,
    principal: data.map((p) => p.principal).reduce((a, b) => a + b, 0),
    fee: data.map((p) => p.fee).reduce((a, b) => a + b, 0)
  };

  const pending = {
    count: pendingPayments.length,
    principal: pendingPayments.map((p) => p.principal).reduce((a, b) => a + b, 0),
    fee: pendingPayments.map((p) => p.fee).reduce((a, b) => a + b, 0)
  };

  const paid = {
    count: paidPayments.length,
    principal: paidPayments.map((p) => p.principal).reduce((a, b) => a + b, 0),
    fee: paidPayments.map((p) => p.fee).reduce((a, b) => a + b, 0),
    processedAfter
  };

  return {
    all,
    paid,
    pending,
    pendingPayments: pendingPayments.slice(0, 100)
  };
}

export default function collection(datesRange) {
  const dates = {
    start: new Date(datesRange.startDate),
    end: endOfDay(new Date(datesRange.endDate))
  };

  function transform(doc) {
    const capitalPerPayment = doc.amount / doc.numberOfPayments;

    const payments = doc.payments
      .filter((p) => p.transferUrl)
      .filter(({ initiatedAt }) => {
        const date = new Date(initiatedAt);
        return date >= dates.start && date <= dates.end;
      })
      .map((p) => ({
        ...p,
        cashAdvanceID: doc._id,
        userID: doc.userId,
        fee: p.fee || p.amount - capitalPerPayment,
        principal: p.principal || capitalPerPayment,
        dealFee: doc.fee,
        dealAmount: doc.amount
      }));

    return { payments };
  }

  const query = {
    $and: [
      { status: { $in: ['active', 'completed'] } },
      {
        payments: {
          $elemMatch: {
            status: { $in: ['schedule', 'pending', 'paid', 'declined'] },
            initiatedAt: {
              $gte: dates.start,
              $lt: dates.end
            }
          }
        }
      }
    ]
  };
  const deals = Deals.find(query, { transform }).fetch();

  const payments = flatten(deals.map((d) => d.payments));
  return process(payments, dates);
}

Meteor.methods({
  'accounting.collection': function collectionMethod(params) {
    Security.checkIfAdmin(this.userId);
    const results = collection(params);
    delete results.pendingPayments;
    return results;
  },
  'accounting.collection.checkPendingPayments': async function checkPendingPayments(params) {
    Security.checkIfAdmin(this.userId);
    const { pendingPayments } = collection(params);

    if (pendingPayments.length > 20) return 'too many pending payments';

    const results = await Promise.all(
      pendingPayments.map((p) => checkIfPaymentProcessed({ dealID: p.cashAdvanceID, paymentNumber: p.number }))
    );
    return results;
  }
});
