import { Meteor } from 'meteor/meteor';
import logger from '../logger/log';
import plaidClient from './plaid';
import markItemLoginRequired from './markItemLoginRequired';

export default async function getBalance({ user, userID }) {
  const customer = user || Meteor.users.findOne({ _id: userID }) || {};
  try {
    const { plaidAccessToken, bankAccount, plaid } = customer;

    if (plaid && plaid.itemLoginRequired) return false;

    const request = {
      access_token: plaidAccessToken
    };

    const response = await plaidClient.accountsBalanceGet(request);

    const accounts = response.data.accounts;

    if (accounts.length > 0) {
      const matchedAccount = accounts.find((a) => a.account_id === bankAccount.id);
      return matchedAccount.balances;
    }

    return false;
  } catch (error) {
    markItemLoginRequired(customer._id, error);

    logger.error(`[${userID}] plaid.getBalance ${error}`);
    return false;
  }
}
