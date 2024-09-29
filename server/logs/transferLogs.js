import { Mongo } from 'meteor/mongo';
import logger from '../logger/log';
import * as Sentry from '@sentry/node';
export const TransferLogs = new Mongo.Collection('transferLogs');

function logTransfer(payload) {
  try {
    TransferLogs.insert({
      ...payload,
      createdDate: new Date(payload.created),
      logTimestamp: new Date()
    });
    return true;
  } catch (error) {
    Sentry.captureException(error);
    logger.error(` logTransfer [${payload}]${error}`);
    return false;
  }
}

export default logTransfer;
