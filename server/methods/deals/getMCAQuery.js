import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import format from 'date-fns/format';
import Security from '../../utils/security';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
function cfloew(words) {
  const separateWord = words.toLowerCase().split(' ');
  for (let i = 0; i < separateWord.length; i++) {
    separateWord[i] = separateWord[i].charAt(0).toUpperCase() + separateWord[i].substring(1);
  }
  return separateWord.join(' ');
}

function getMCAQuery({ userID, draftDeal }) {
  Security.checkLoggedIn(this.userId);
  check(userID, String);
  check(draftDeal.amount, Number);
  check(draftDeal.weeklyPayment, Number);
  check(draftDeal.specifiedAmount, Number);
  check(draftDeal.specifiedPercentage, Number);
  check(draftDeal.weeklyIncomeAvg, Number);
  check(draftDeal.feeAmount, Number);

  const { amount, weeklyPayment, specifiedAmount, specifiedPercentage, weeklyIncomeAvg, feeAmount } = draftDeal;

  try {
    const user = Meteor.users.findOne({ _id: userID });

    if (user) {
      const result = new URLSearchParams({
        date: format(new Date(), 'MM/dd/y'),
        purchasePrice: `${amount}`,
        language: `${user.language}`,
        specifiedAmount: `${specifiedAmount}`,
        weeklyTransfer: `${weeklyPayment}`,
        specifiedPercentage: `${specifiedPercentage}`,
        name: `${cfloew(user.firstName)} ${cfloew(user.lastName)}`,
        averageVerifiedHistoricalRevenue: `${weeklyIncomeAvg}`,
        designatedAccount: `${user?.bankAccount?.mask} - ${user?.bankAccount?.bankName}`,
        feeAmount: `${feeAmount}`,
        email: `${user?.emails[0]?.address}`,
        address: `${user?.address?.street1}`,
        phone: `${user?.phone?.number}`,
        industry: `${user?.business?.industry}`,
        entityType: `${user?.business?.entityType}`,
        stateOfIncorporation: `${user?.business?.stateOfIncorporation}`,
        physicalAddress: `${user?.business?.physicalAddress}`,
        mailingAddress: `${user?.business?.mailingAddress}`,
        federalTaxpayerId: `${user?.business?.federalTaxpayerId}`,
        doingBusinessAs: `${user?.business?.doingBusinessAs}`,
        phoneBusiness: `${user?.business?.phone}`,
        mask: `${user?.bankAccount?.mask}`
      }).toString();

      return result;
    } else {
      throw new Meteor.Error('NO USER FOUND');
    }
  } catch (error) {
    logger.error(`deals.getMCAQuery ${JSON.stringify(error)}`);
    Sentry.captureException(error);
    throw new Meteor.Error('INTERNAL SERVER ERROR');
  }
}

Meteor.methods({ 'deals.getMCAQuery': getMCAQuery });
