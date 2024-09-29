import logger from '../../logger/log';
import Reports from '../../collections/reports';
import * as Sentry from '@sentry/node';
export default async function createBorrowingBaseReport(job, done) {
  try {
    if (result) {
      //   const report = Reports.insert({
      //     type: "borrowingBase",
      //     ready: true,
      //     created: new Date(),
      //     report: {
      //       ...result,
      //     },
      //   });
      done();
    } else {
      throw new Error('Nothing returned');
    }
  } catch (error) {
    console.log(error);
    Sentry.captureException(error);
    logger.error(`agenda.jobs.createBorrowingBaseReport: ${error}`);
    job.fail(error);
    done();
  }
}
