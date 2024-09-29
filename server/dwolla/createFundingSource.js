import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Dwolla from './dwolla';
import logger from '../logger/log';
import * as Sentry from '@sentry/node';
export default async function createFundingSource(customerUrl, processorToken, bankAccount) {
  check(customerUrl, String);
  check(bankAccount, Object);

  const requestBody = {
    plaidToken: processorToken,
    name: bankAccount.name
  };

  try {
    const FundingURL = await Dwolla()
      .post(`${customerUrl}/funding-sources`, requestBody)
      .then((res) => res.headers.get('location'))
      .catch((error) => {
        if (error.body.code === 'DuplicateResource') {
          return error.body._links.about.href;
        }
        throw error;
      });

    return FundingURL;
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`createFundingSource [${customerUrl}] ${JSON.stringify(error)}`);
    throw new Meteor.Error('Error at createFundingSource', error);
  }
}
