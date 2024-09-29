import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import customerRecord from './customerRecord';
import Security from '../../../utils/security';
import logger from '../../../../server/logger/log';
import * as Sentry from '@sentry/node';

export default async function customerStatus(_dwollaCustomerURL, userId) {
  let dwollaCustomerURL = _dwollaCustomerURL;
  try {

    // temporary fix for the issue with the dwollaCustomerURL because truncated URL is being saved in the database when user is deleted
    if (!/\/customers\//.test(dwollaCustomerURL)) {
      dwollaCustomerURL = `https://api.dwolla.com/customers/${dwollaCustomerURL}`;
    }

    const customer = await customerRecord(dwollaCustomerURL);
    if (!customer) return false;

    if (customer.status === 'suspended') return 'suspended';
    if (customer.status === 'unverified' && customer.fundingSources.some((f) => f.status === 'verified'))
      return 'active';

    return customer.status || 'deactivated';
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`users.dwollaCustomerStatus ${error}`);
    return false;
  }
}

Meteor.methods({
  'users.dwollaCustomerStatus': function customerStatusMethod(userID) {
    check(userID, String);
    this.unblock();
    Security.checkIfAdmin(this.userId);
    const user = Meteor.users.findOne({ _id: userID });
    if (!user) return false;
    const { dwollaCustomerURL } = user;
    if (!dwollaCustomerURL) {
      return false;
    }
    return customerStatus(dwollaCustomerURL, userID);
  }
});
