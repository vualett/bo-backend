import { Meteor } from 'meteor/meteor';
import Documents from '../../../collections/documents';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';

export async function saveDbFile(data: Meteor.Documents): Promise<void> {
  try {
    await Documents.insertAsync(data);
  } catch (error) {
    const { message } = error as Meteor.Error;
    logger.error(`saveDbFile: [${message}]`);
    Sentry.captureException(error);
  }
}
