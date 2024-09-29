import removeFundingSource from '../../../dwolla/removeFundingSource';
import { Meteor } from 'meteor/meteor';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';

export default async function webhookCustomerFundingSourceRemoved(payload) {
  try {
    const { customer, resource } = payload._links;

    const dwollaCustomerURL = customer.href;
    const dwollaFundingURL = resource.href;

    const user = Meteor.users.findOne({ dwollaCustomerURL, dwollaFundingURL });

    if (!user) {
      throw new Meteor.Error('USER_NOT_FOUND_WITH_FUNDING_SOURCE');
    }

    Meteor.users.update(user._id, { $set: { blockAddBankAccount: true } });
    await removeFundingSource(user._id, null, true, false);
  } catch (error) {
    logger.error(`webhookCustomerFundingSourceRemoved: ${payload}`);
    Sentry.captureException(`webhookCustomerFundingSourceRemoved: ${payload}`);
  }
}
