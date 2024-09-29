import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import getTransfer from './getTransfer';
import Security from '../utils/security';
import removeFundingSource from './removeFundingSource';
import updateCustomerRecord from './updateCustomerRecord';
import cancelTransfer from './cancelTransfer';
import getFundingSource from './getFundingSource';
import './getTransfers';
import './getFailure';
import './ualettAccount';
import './bulkUpdateEmailDwolla';
import Dwolla from './dwolla';
import retryFailedTransfer from './retryFailedTransfer';
import { DWOLLA_WEBHOOK_SECRET } from '../keys';

// /CREATE DWOLLA WEBHOOK SUB
async function createWebhookSubscription(url) {
  Security.checkRole(this.userId, 'super-admin');
  const requestBody = {
    url,
    secret: DWOLLA_WEBHOOK_SECRET
  };

  return Dwolla()
    .post('webhook-subscriptions', requestBody)
    .then((res) => res.body);
}

// /GET DWOLLA WEBHOOK SUB
async function getWebhookSubscriptions() {
  Security.checkIfAdmin(this.userId);
  return Dwolla()
    .get('webhook-subscriptions')
    .then((res) => res.body);
}

// /UPDATE FUNDING NAME
async function updateFundingName(fundingURL, name) {
  check(fundingURL, String);
  check(name, String);
  Security.checkRole(this.userId, 'super-admin');

  return Dwolla()
    .post(fundingURL, { name })
    .then((res) => res.body);
}

// /METHODS
Meteor.methods({
  'dwolla.removeFundingSource': function removeBankAccount(UserId, FundingURL, local) {
    Security.checkAccess(Meteor.userId(), ['removeBankAcc']);
    removeFundingSource(UserId, FundingURL, local, true, Meteor.userId());
  },
  'dwolla.getWebhookSubscriptions': getWebhookSubscriptions,
  'dwolla.createWebhookSubscription': createWebhookSubscription,
  'dwolla.updateFundingName': updateFundingName,
  'dwolla.updateCustomerRecord': updateCustomerRecord,
  'dwolla.retryFailedTransfer': retryFailedTransfer,
  'dwolla.getTransfer': function dwollaGetTransfer(url) {
    check(url, String);
    Security.checkRole(this.userId, 'super-admin');
    const result = getTransfer(url);
    return result;
  },
  'dwolla.getFundingSource': function dwollaGetFundingSource(url) {
    check(url, String);
    Security.checkLoggedIn(Meteor.userId());
    const result = getFundingSource(url);
    return result;

  },
  'dwolla.cancelTransfer': cancelTransfer
});
