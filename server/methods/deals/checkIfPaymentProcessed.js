import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import getTransfer from '../../dwolla/getTransfer';
import Deals from '../../collections/deals';
import madePayment from './madePayment';
import declinePayment from './declinePayment';
import Security from '../../utils/security';

async function markPaymentAsCancelled(dealId, payment) {
  const { number } = payment;

  const set = {
    'payments.$.status': 'schedule'
  };

  if (!payment.cancelledDate) set['payments.$.cancelledDate'] = new Date();

  await Deals.updateAsync(
    {
      _id: dealId,
      'payments.number': number
    },
    {
      $set: set
    }
  );
}

export default async function checkIfPaymentProcessed({ dealID, paymentNumber }) {
  check(dealID, String);
  check(paymentNumber, Number);

  const deal = await Deals.findOneAsync({ _id: dealID });
  if (!deal) return false;

  const payment = deal.payments.find((p) => p.number === paymentNumber);

  if (payment) {
    const { transferUrl } = payment;

    if (transferUrl) {
      const transfer = await getTransfer(transferUrl);

      if (!transfer) return false;

      if (['pending', 'paid'].includes(payment.status)) {
        if (transfer.status === 'processed') madePayment(dealID, paymentNumber);

        if (transfer.status === 'cancelled') markPaymentAsCancelled(dealID, payment);

        if (transfer.status === 'failed') {
          const failure = await getTransfer(`${transferUrl}/failure`);

          declinePayment({
            id: dealID,
            paymentNumber,
            returnCode: failure.code
          });
        }
      }

      return transfer;
    }

    return false;
  }

  return false;
}

Meteor.methods({
  'deals.checkIfPaymentProcessed': function checkIfPaymentProcessedMethod(params) {
    Security.checkIfAdmin(this.userId);
    return checkIfPaymentProcessed(params);
  }
});
