import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import getBalance from '../../../plaid/getBalance';
import Security from '../../../utils/security';
import logger from '../../../../server/logger/log';
import * as Sentry from '@sentry/node';
function checkIfTooSoon(date) {
  const control = 1000 * 60 * 60;
  const diffTime = Math.abs(new Date().getTime() - new Date(date).getTime());
  return diffTime < control;
}

const getBankAccountBalances = async (userID) => {
  try {
    check(userID, String);
    Security.checkAccess(Meteor.userId(), ['getBankAccountBalance']);

    const customer = Meteor.users.findOne({ _id: userID });

    if (customer.bankAccount.balances) {
      if (checkIfTooSoon(customer.bankAccount.balances.lastChecked)) return customer.bankAccount.balances;
    }

    const balances = await getBalance({ user: customer });
    if (!balances) return false;

    const set = { ...balances, lastChecked: new Date() };

    Meteor.users.update({ _id: userID }, { $set: { 'bankAccount.balances': set } });

    return balances;
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`[${userID}] [getBankAccountBalances] ${error}`);
    throw new Meteor.error(error);
  }
};

Meteor.methods({
  'users.getBankAccountBalances': getBankAccountBalances
});
