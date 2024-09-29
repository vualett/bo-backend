/* eslint-disable  @typescript-eslint/explicit-function-return-type */
/* eslint-disable  @typescript-eslint/strict-boolean-expressions */
import { Meteor } from 'meteor/meteor';
import ArgyleReports from '../../../collections/argyleReports';
import logger from '../..//../logger/log';
import * as Sentry from '@sentry/node';
import { check } from 'meteor/check';
import Security from '../../../utils/security';

export default async function getAllArgyleReportsByUserId(userId: string) {
  Security.checkIfAdmin(Meteor.userId());
  check(userId, String);

  try {
    const reports = await ArgyleReports.find({ userId },
      { fields: { _id: 1, status: 1, create_at: 1, }, sort: { create_at: -1 }, limit: 10 }).fetchAsync();

    if (!reports || reports.length === 0) {
      throw new Meteor.Error('REPORT_NOT_FOUND!');
    }

    return reports;
  } catch (error) {
    const { message } = error as Meteor.Error;
    logger.error(`getAllReports: ${userId} [${message}]`);
    Sentry.captureException(error, { extra: { userId } });
  }
}
