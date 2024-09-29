/* eslint-disable  @typescript-eslint/explicit-function-return-type */
/* eslint-disable  @typescript-eslint/strict-boolean-expressions */
import { Meteor } from 'meteor/meteor';
import ArgyleReports from '../../../collections/argyleReports';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';
import { queueGetReportById } from '../../../queue/queue';
import { check } from 'meteor/check';
import ArgyleApi from '../argyleAPI';

export default async function createArgyleReport(argyleUserId: string) {
  check(argyleUserId, String);

  try {
    const user = Meteor.users.findOne({ 'argyle.id': argyleUserId });

    if (!user) {
      throw new Meteor.Error('USER_NOT_FOUND!');
    }

    const report = await ArgyleApi.createReport(argyleUserId);

    ArgyleReports.insert({ _id: report.id, ...report, ...{ userId: user._id }, create_at: new Date() });
    await queueGetReportById(report.id);
    return report;
  } catch (error) {
    const { message } = error as Meteor.Error;
    logger.error(`createArgyleReport: ${argyleUserId} [${message}]`);
    Sentry.captureException(error, { extra: { argyleUserId } });
  }
}
