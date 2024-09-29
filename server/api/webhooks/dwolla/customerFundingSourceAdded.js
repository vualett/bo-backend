import { Meteor } from 'meteor/meteor';
import logger from '../../../logger/log';

export default async function webhookCustomerFundingSourceAdded(payload) {
  const dwollaCustomerURL = payload._links.customer.href;
  const dwollaFundingURL = payload._links.resource.href;
  const user = Meteor.users.findOne({ dwollaCustomerURL });

  if (user.dwollaFundingURL !== dwollaFundingURL) {
    logger.error(
      `[dwollaFundingURL Mismatch] [webhookCustomerFundingSourceAdded] [${user._id}]:  current : ${user.dwollaFundingURL}, new : ${dwollaFundingURL}`
    );
  }
}
