import Deals from '../../../collections/deals';
import { Random } from 'meteor/random';
import { setDateInOverdueInDeal } from '../setDateInOverdueDeal';

export default async function reschedulePayment(args) {
  const { dealID, payment, rescheduledBy, newDate, doMetric } = args;

  const paymentNumber = payment.number;

  const update = {
    $set: {
      'payments.$.status': 'schedule',
      'payments.$.date': newDate,
      'payments.$.rescheduledBy': rescheduledBy || null,
      'payments.$.idempotencyKey': Random.id(),
      'payments.$.rescheduleAt': new Date()
    }
  };

  if (payment.skip) update.$set['payments.$.skip'] = false;

  if (!payment.originalDate) update.$set['payments.$.originalDate'] = payment.date;

  if (doMetric && payment.status !== 'declined') {
    update.$inc = {
      'metrics.rescheduledPayments': 1,
      'payments.$.rescheduledCount': 1
    };
  }

  Deals.update(
    {
      _id: dealID,
      'payments.number': paymentNumber
    },
    update
  );

  await setDateInOverdueInDeal(dealID);
}
