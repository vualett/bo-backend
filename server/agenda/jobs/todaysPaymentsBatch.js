/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
import { startOfDay, addDays } from 'date-fns';
import Deals from '../../collections/deals';

import { queueInitiatePayment } from '../../queue/queue';

export default function todaysPaymentsBatch(job, done) {
  const dates = {
    start: startOfDay(new Date()),
    end: addDays(startOfDay(new Date()), 1)
  };

  const pipeline = [
    {
      $match: {
        status: 'active',
        debitChannel: 'STANDARD_ACH',
        'payments.date': { $gte: dates.start, $lt: dates.end }
      }
    },
    { $unwind: '$payments' },
    {
      $project: {
        _id: 0,
        dealId: '$_id',
        userId: 1,
        payment: '$payments'
      }
    },
    {
      $match: {
        'payment.status': 'schedule',
        'payment.date': { $gte: dates.start, $lt: dates.end }
      }
    }
  ];

  async function checkIfGoodStandingToInitPayment(dealID) {
    const deal = await Deals.findOne({ _id: dealID });
    if (deal) {
      const badPayments = deal.payments.filter((p) => p.status === 'declined');
      if (badPayments.length > 3) return false;
    }
    return true;
  }

  (async () => {
    const payments = await Deals.rawCollection().aggregate(pipeline).toArray();

    let notToInitiate = 0;
    let skipped = 0;

    for (const p of payments) {
      if (!p.payment.skip) {
        if (await checkIfGoodStandingToInitPayment(p.dealId)) {
          queueInitiatePayment({
            userId: p.userId,
            dealId: p.dealId,
            paymentNumber: p.payment.number,
            idempotencyKey: p.payment.idempotencyKey,
            amount: p.payment.amount
          });
        } else {
          notToInitiate += 1;
        }
      } else {
        skipped += 1;
      }
    }

    job.attrs.results = {
      dates,
      paymentsForToday: payments.length,
      notToInitiate,
      skipped
    };
    await job.save();
  })().then(done, done);
}
