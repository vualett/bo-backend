import logger from '../../logger/log';
import Reports from '../../collections/reports';
import generalMetrics from '../../methods/metrics/generalMetrics';
import * as Sentry from '@sentry/node';

export default async function generalMetricsJob(job, done) {
  try {
    const result = await generalMetrics();
    if (result) {
      Reports.insert({
        type: 'generalMetrics',
        ready: true,
        created: new Date(),
        report: {
          ...result
        }
      });
      done();
    } else {
      throw new Error('Nothing returned');
    }
  } catch (error) {
    console.log(error);
    Sentry.captureException(error);
    logger.error(`agenda.jobs.generalMetricsJob: ${error}`);
    job.fail(error);
    done();
  }
}
