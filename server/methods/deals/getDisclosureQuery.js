import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import format from 'date-fns/format';
import Security from '../../utils/security';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import { $ } from 'moneysafe';
function cfloew(words) {
  const separateWord = words.toLowerCase().split(' ');
  for (let i = 0; i < separateWord.length; i++) {
    separateWord[i] = separateWord[i].charAt(0).toUpperCase() + separateWord[i].substring(1);
  }
  return separateWord.join(' ');
}

export const groupPaymentsByMonth = (payments) => {
  return payments.reduce((months, payment) => {
    const month = payment.date.getMonth();
    months[month] ?? (months[month] = []);
    months[month].push(payment);
    return months;
  }, {});
};

export const calculateMonthlyTotal = (payments) => {
  return payments.reduce((sum, payment) => sum + payment.amount, 0);
};

export const getMaxMonthlyPayment = (payments) => {
  const paymentsByMonth = groupPaymentsByMonth(payments);
  const monthlyTotals = Object.values(paymentsByMonth).map(calculateMonthlyTotal);
  return Math.max(...monthlyTotals, 0);
};

function getDisclosureQuery({ userID, draftDeal }) {
  Security.checkLoggedIn(this.userId);
  check(userID, String);
  check(draftDeal.amount, Number);
  check(draftDeal.weeklyPayment, Number);
  check(draftDeal.specifiedAmount, Number);
  check(draftDeal.specifiedPercentage, Number);
  check(draftDeal.weeklyIncomeAvg, Number);
  check(draftDeal.feeAmount, Number);

  const {
    amount,
    weeklyPayment,
    specifiedAmount,
    specifiedPercentage,
    weeklyIncomeAvg,
    feeAmount,
    fee,
    numberOfPayments
  } = draftDeal;

  try {
    const user = Meteor.users.findOne({ _id: userID });

    const disclosureProps = {
      state: user?.address.state,
      monthTransfer: `${getMaxMonthlyPayment(draftDeal.payments)}`,
      estimatedAnnualPercentage: `${draftDeal.estimatedAnnualPercentage}`,
      term: `${draftDeal.term}`,
      validAmountSold: `${Math.round(draftDeal.amount + draftDeal.feeAmount)}`
    };

    if (user) {
      const result = new URLSearchParams({
        date: format(new Date(), 'MM/dd/y'),
        purchasePrice: `${amount}`,
        specifiedAmount: `${specifiedAmount}`,
        weeklyTransfer: `${weeklyPayment}`,
        specifiedPercentage: `${specifiedPercentage}`,
        name: `${cfloew(user.firstName)} ${cfloew(user.lastName)}`,
        language: `${user.language}`,
        address: `${user?.address?.street1}`,
        averageVerifiedHistoricalRevenue: `${weeklyIncomeAvg}`,
        designatedAccount: `${user?.bankAccount?.mask} - ${user?.bankAccount?.bankName}`,
        subWeeklyTransferMonth: `${disclosureProps.monthTransfer - weeklyPayment}`,
        feeAmount: `${feeAmount}`,
        numberOfPayments: `${numberOfPayments}`,
        estimatedAverageMonthlyIncome: `${weeklyIncomeAvg * 4}`,
        validAmountSold: `${$(amount)
          .add($(amount * fee))
          .toNumber()}`,
        ...disclosureProps
      }).toString();

      return result;
    } else {
      throw new Meteor.Error('NO USER FOUND');
    }
  } catch (error) {
    logger.error(`deals.getDisclosureQuery ${JSON.stringify(error)}`);
    Sentry.captureException(error);
    throw new Meteor.Error('INTERNAL SERVER ERROR');
  }
}

Meteor.methods({ 'deals.getDisclosureQuery': getDisclosureQuery });
