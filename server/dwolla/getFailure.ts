import { Meteor } from 'meteor/meteor';
import Dwolla from './dwolla';
import logger from '../logger/log';
import * as Sentry from '@sentry/node';
export default async function getFailure(transferUrl: string) {
  try {
    return Dwolla()
      .get(`${transferUrl}/failure`)
      .then((res) => res.body.code);
  } catch (error) {
    Sentry.captureException(error);
    log.error(error);
  }
}

Meteor.methods({
  'dwolla.getFailure': function dwollaGetFailure(transferUrl) {
    try {
      const result = getFailure(transferUrl);
      return result;
    } catch (error: unknown) {
      const { message } = error as Error;
      Sentry.captureException(error);
      logger.error(`[dwolla.getFailure] ${message}`);
      throw error;
    }
  }
});
