import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Deals from '../../collections/deals';
import dwollaTransferOut from '../../dwolla/transferOut';
import Security from '../../utils/security';
import { addWeeks } from 'date-fns';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
// Return the latest of the given dates.
function latestOf(dates) {
  return dates.reduce((latest, date) => {
    if (date > latest) return date;
    return latest;
  }, 0);
}

export default async function refundPayment(dealId, paymentNumber) {
  try {
    check(dealId, String);
    check(paymentNumber, Number);

    Security.checkRole(this.userId, ['super-admin']);

    const Deal = Deals.findOne({ _id: dealId });

    if (!Deal) throw new Meteor.Error('CASH_ADVANCE_NOT_FOUND');

    const User = Meteor.users.findOne({ _id: Deal.userId });

    const payment = Deal.payments.find((p) => p.number === paymentNumber);

    if (payment.refunded) throw new Meteor.Error('PAYMENT_ALREADY_REFUNDED');

    const transferMetadata = {
      dealId: Deal._id,
      userId: Deal.userId,
      paymentNumber: payment.number,
      transferReason: 'refund'
    };

    const set = {
      'payments.$.refunded': true,
      'payments.$.refundedAt': new Date()
    };

    const RTPEnabled = true;

    const refundTransfer = await dwollaTransferOut(
      User.dwollaFundingURL,
      payment.amount,
      transferMetadata,
      payment.idempotencyKey,
      RTPEnabled
    );

    const newPaymentNumber = Deal.payments.length + 1;
    const newPaymentDate = addWeeks(latestOf(Deal.payments.map((p) => p.date)), 1);

    const newPaymentObj = {
      number: newPaymentNumber,
      status: 'schedule',
      amount: payment.amount,
      fee: payment.fee,
      principal: payment.principal,
      date: newPaymentDate,
      refundTransfer: refundTransfer
    };

    //updating the payment status to refunded
    await Deals.update({ _id: dealId, 'payments.number': paymentNumber }, { $set: set });

    //pushing new payment to the end of the array
    await Deals.update({ _id: dealId }, { $push: { payments: newPaymentObj } });

    return true;
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`["deals.refundPayment"] ${error}`);
    return false;
  }
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.refundPayment'
};

DDPRateLimiter.addRule(method, 1, 5000);

Meteor.methods({
  [method.name]: refundPayment
});
