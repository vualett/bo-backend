import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import createFundingSource from '../../../dwolla/createFundingSource';
import Security from '../../../utils/security';
import plaidClient from '../../../plaid/plaid';
import * as Sentry from '@sentry/node';
import markItemLoginRequired from '../../../plaid/markItemLoginRequired';
import logger from '../../../../server/logger/log';
function updateUser(user, fundingURL) {
  const set = {
    dwollaFundingURL: fundingURL
  };

  if (!user.hasFunding && user.bankAccount) set.hasFunding = true;
  if (user.dwollaFundingURL) set.old_dwollaFundingURL = user.dwollaFundingURL;

  Meteor.users.update({ _id: user._id }, { $set: set });
}

async function createProcessorTokenAndAddFunding(UserId, _accountId) {
  const user = Meteor.users.findOne({ _id: UserId });
  try {
    const { bankAccount } = user;
    const { plaidAccessToken, dwollaCustomerURL } = user;
    const accountId = _accountId || bankAccount.id;

    const request = {
      access_token: plaidAccessToken,
      account_id: accountId,
      processor: 'dwolla'
    };

    const response = await plaidClient.processorTokenCreate(request);

    // eslint-disable-next-line camelcase, no-unused-vars
    const { processor_token } = response;

    // eslint-disable-next-line no-undef
    const fundingURL = await createFundingSource(dwollaCustomerURL, processorToken, bankAccount);

    if (!fundingURL) throw new Meteor.Error('NOT_FUNDING_URL');

    updateUser(user, fundingURL);
  } catch (error) {
    logger.error(`users.dwolla.tryRelinkBankAccount ${error}`);
    markItemLoginRequired(user._id, error);

    Sentry.captureException(error);
    throw new Meteor.Error(error);
  }
}

// METHOD
Meteor.methods({
  'users.dwolla.tryRelinkBankAccount': function tryRelinkBankAccount(userID, _accountId) {
    check(userID, String);
    check(_accountId, Match.Maybe(String));

    Security.checkRole(this.userId, ['super-admin', 'technical', 'admin', 'manager', 'overdue']);

    return createProcessorTokenAndAddFunding(userID, _accountId);
  }
});
