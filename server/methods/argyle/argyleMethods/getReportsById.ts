/* eslint-disable  @typescript-eslint/explicit-function-return-type */
/* eslint-disable  @typescript-eslint/strict-boolean-expressions */
import { Meteor } from 'meteor/meteor';
import ArgyleReports from '../../../collections/argyleReports';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';
import { check } from 'meteor/check';
import ArgyleApi from '../argyleAPI';

function getArgyleReportExpiredDate(url: string): Date | undefined {
  const keyWord = 'Expires=';
  const startIndex = keyWord.length;

  if (url.includes(keyWord)) {
    const index = url.lastIndexOf(keyWord) + startIndex;

    let res = '';

    for (let i = index; i < url.length; i++) {
      if (url.charAt(i) === '&') break;

      res += url.charAt(i);
    }

    return new Date(Number(res) * 1000);
  }
  return undefined;
}

export default async function getArgyleReportsById(reportId: string) {
  check(reportId, String);

  try {
    let report = ArgyleReports.findOne({ _id: reportId });

    if (!report) {
      throw new Meteor.Error('REPORT_NOT_FOUND!');
    }

    if (report?.status === 'generated') {
      const reportExpiredDate = report?.expired_at ? new Date(report.expired_at) : null;
      const now = new Date();

      if (reportExpiredDate !== null && reportExpiredDate >= now) {
        return report;
      }
      report.status = 'generating';
    }

    if (report?.status === 'generating') {
      report = await ArgyleApi.getReport(reportId);

      if (report && report.status === 'generated') {
        const argyleExpiredDate = getArgyleReportExpiredDate(report.file_url ?? '');

        ArgyleReports.update(
          { _id: reportId },
          {
            $set: {
              file_url: report.file_url,
              generated_at: report.generated_at,
              status: report.status,
              expired_at: argyleExpiredDate
            }
          }
        );
        return report;
      }
    }
    throw new Meteor.Error('REPORT_NOT_READY');
  } catch (error) {
    const { message } = error as Meteor.Error;
    logger.error(`getReport: ${reportId} [${message}]`);
    Sentry.captureException(error, { extra: { reportId } });
  }
}
