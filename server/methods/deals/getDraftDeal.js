/* eslint-disable no-unneeded-ternary */
/* eslint-disable dot-notation */
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { Random } from 'meteor/random';
import { Settings } from '../../collections/settings';
import { $, divide, multiply } from 'moneysafe';
import getPaymentDay from './processDeal/getPaymentDay';
import Security from '../../utils/security';
import logger from '../../logger/log';
import { applyDiscount } from '../../methods/deals/feeDiscount/feeDiscount';
import * as Sentry from '@sentry/node';
import { sendNotification } from '../../bot/sendNotification';
import { GetArrayPayments } from '../../utils/calculateInstallments';

export const getTermsInDays = ({ numberOfPayments, termsOfPayment }) => {
  if (termsOfPayment !== 'weekly') {
    throw new Meteor.Error('Invalid termsOfPayment');
  }
  const days = numberOfPayments * 7;

  return `${days} days`;
};

const getDraftDeal = async (deal, userId) => {
  const USER_ID = userId || Meteor.userId();

  Security.checkLoggedIn(Meteor.userId());

  check(deal, {
    amount: Number,
    termsOfPayment: String,
    numberOfPayments: Number,
    fee: Number,
    weeklyPayment: Number
  });

  const user = Meteor.users.findOne({ _id: USER_ID });
  if (!user) {
    throw new Meteor.Error('USER_NOT_FOUND');
  }
  if (user.status?.upgradeRequested === true) throw new Meteor.Error('we are processing you upgrade request');
  try {
    if (deal.amount === 0) throw new Meteor.Error('CASH_ADVANCE_DISABLED');

    const { amount, fee, numberOfPayments, termsOfPayment, weeklyPayment } = deal;

    const productName = `CA${amount + termsOfPayment.toUpperCase()}#${numberOfPayments}@${fee}`;

    const createdAt = new Date();

    const addFeeDiscount = await applyDiscount();

    const weeklyIncomeByProduct = await Settings.findOne({
      _id: 'weeklyIncomeByProduct'
    });

    const _weeklyIncomeByProduct = weeklyIncomeByProduct || {
      300: 166.6,
      550: 416.6,
      700: 500,
      1000: 750,
      1500: 1000,
      2000: 1250,
      3000: 1500
    };

    const specifiedPercentage =
      Math.floor(
        multiply(divide($(weeklyPayment), $(_weeklyIncomeByProduct[amount] || 700)), $(100))
          .add($(2))
          .valueOf()
      ) ?? 0;

    // // // debug
    if (specifiedPercentage === 0) {
      sendNotification(`‼️ specifiedPercentage render 0 | deal:${JSON.stringify(deal)}`);
    }
    // // // end debug

    const paymentDate = getPaymentDay(new Date(), user.paymentISODay);

    const paymentsArray = GetArrayPayments({
      dealAmount: deal.amount,
      numberOfPayments: deal.numberOfPayments,
      feeAmount: (deal.amount * deal.fee),
      paymentDate,
      isReadjusting: false
    });

    const feeAmount = paymentsArray.reduce((acc, curr) => $(acc).add(curr.fee).valueOf(), 0);

    const draftDeal = {
      product_name: productName,
      idempotencyKey: Random.id(),
      status: 'draft',
      userId: USER_ID,
      amount,
      fee,
      feeAmount,
      numberOfPayments,
      termsOfPayment,
      payments: paymentsArray,
      createdAt,
      metrics: { rescheduledPayments: 0, failedPayments: 0 },
      weeklyPayment,
      specifiedAmount: $(amount)
        .add($(amount * fee))
        .toNumber(),
      specifiedPercentage,
      estimatedAnnualPercentage: `${Number(fee * 100).toFixed(2)}`,
      term: getTermsInDays({ numberOfPayments, termsOfPayment }),
      weeklyIncomeAvg: _weeklyIncomeByProduct[amount] || 1500,
      designatedAccount: {
        bankName: user?.bankAccount?.bankName,
        mask: user?.bankAccount?.mask,
        institution_id: user?.bankAccount?.institution_id
      }
    };

    if (addFeeDiscount.isTrue && addFeeDiscount.isTrue != null)
      draftDeal.feeDiscount = $(addFeeDiscount.value).valueOf();

    return draftDeal;
  } catch (error) {
    logger.error(`Error on getDraftDeal: ${error}`);
    if (error.error === 'CASH_ADVANCE_DISABLED') {
      throw new Meteor.Error('Sorry, you can not make a request at the moment, please contact us');
    }
    Sentry.captureException(error);
    throw new Meteor.Error('try again late');
  }
};

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.getDraftDeal',
  clientAddress: () => true
};

DDPRateLimiter.addRule(method, 2, 3000);

Meteor.methods({
  [method.name]: getDraftDeal
});
