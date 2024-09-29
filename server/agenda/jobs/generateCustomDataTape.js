import logger from '../../logger/log';
import dataReportsMakeReport from '../../methods/reports/dataTape/makeReport';
import startOfYear from 'date-fns/startOfYear';
import * as Sentry from '@sentry/node';
export default async function generalMetricsJob(job, done) {
  try {
    const result = await dataReportsMakeReport({
      custom: true,
      start: startOfYear(new Date()),
      end: new Date()
    });
    if (result) {
      done();
    } else {
      throw new Error('Nothing returned');
    }
  } catch (error) {
    job.fail(error);
    Sentry.captureException(error);
    logger.error(`agenda.jobs.generalMetricsJob: ${error}`);
    done();
  }
}
