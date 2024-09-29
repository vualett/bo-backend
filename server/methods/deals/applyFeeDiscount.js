import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { $, multiply } from 'moneysafe';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Deals from '../../collections/deals';
import Security from '../../utils/security';
import { insertDataChangesLog } from '../../dataChangesLogs';
import sleep from '../../utils/sleep';
import logger from '../../logger/log';

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.applyFeeDiscount'
};

function newPaymentsArrayWithNewFee(payments, totalFeeAmount) {
  const scheduledPayments = payments.filter((payment) => payment.status === 'schedule');
  const otherPayments = payments.filter((payment) => payment.status !== 'schedule');

  const otherPaymentsTotalFeeAmount = otherPayments.reduce((acc, payment) => {
    return $(acc).add(payment.fee).valueOf();
  }, 0);

  const totalFeeAmountMinusOtherPayments = $(totalFeeAmount).minus(otherPaymentsTotalFeeAmount).valueOf();

  const newFee = Number(Number(totalFeeAmountMinusOtherPayments / scheduledPayments.length).toFixed(2));

  const scheduledPaymentsWithNewFee = scheduledPayments.map((payment, i) => {
    return {
      ...payment,
      amount: $(payment.principal).add(newFee).valueOf(),
      fee: newFee
    };
  });

  return [...scheduledPaymentsWithNewFee, ...otherPayments].sort((a, b) => a.number - b.number);
}

function applyFeeDiscount(dealID, discount) {

  if (discount > 0.5) throw new Meteor.Error('the discount is too high');

  const deal = Deals.findOne({ _id: dealID });
  if (!deal) throw new Meteor.Error('DEAL_NOT_FOUND');
  if (deal.feeDiscount) throw new Meteor.Error('DISCOUNT_ALREADY_APPLIED');
  if (deal.readjustedCount) throw new Meteor.Error('PAYMENT_READJUSTED');

  if (deal.payments.filter((payment) => payment.status === 'declined').length > 0) {
    throw new Meteor.Error('HAS_FAILED_PAYMENT');
  }

  const discountAmount = multiply($(deal.feeAmount), $(discount)).valueOf();

  const newFeeAmount = $(deal.feeAmount).minus(discountAmount).valueOf();

  const newPaymentsArray = newPaymentsArrayWithNewFee(deal.payments, newFeeAmount);

  const newPaymentsArrTotalAmount = newPaymentsArray.reduce((acc, payment) => {
    return $(acc).add(payment.amount).valueOf();
  }, 0);

  if (newPaymentsArrTotalAmount !== $(newFeeAmount).add(deal.amount).valueOf()) {
    throw new Meteor.Error('the new fee amount is not equal to the total amount of the payments');
  }

  const setToUpdate = {
    feeAmount: newFeeAmount,
    feeDiscount: discount,
    payments: newPaymentsArray
  };

  insertDataChangesLog({
    where: 'deals',
    documentID: deal._id,
    operation: 'update',
    method: 'applyFeeDiscount',
    createdBy: Meteor.userId(),
    old_data: deal,
    new_data: setToUpdate
  });

  const updated = Deals.update(
    {
      _id: dealID
    },
    {
      $set: setToUpdate
    }
  );

  if (!updated) throw new Meteor.Error('FAIL_UPDATING_CASHADVANCE');

  Meteor.call('logs.insert', deal.userId, 'fee discount applied');
}

DDPRateLimiter.addRule(method, 1, 500);

Meteor.methods({
  [method.name]: async function applyFeeDiscountMethod(dealIds, discount) {
    Security.checkRole(Meteor.userId(), ['technical', 'super-admin']);
    check(dealIds, [String]);
    check(discount, Number);

    const results = [];

    for (const id of dealIds) {
      try {
        const result = await applyFeeDiscount(id, discount);
        results.push(`${id} : ${result}`);
        await sleep(100);
      } catch (error) {
        logger.error(`deals.applyFeeDiscount [${id}] ${JSON.stringify(error)}`);
        results.push(`${id} : ${error}`);
      }
    }
    return results;
  }
});
