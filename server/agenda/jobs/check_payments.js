import batchCheckIfPaymentsProcessed from '../../methods/batch/checkIfPaymentsProcessed';
import logger from '../../logger/log';

export default function checkPayments(job, done) {
  batchCheckIfPaymentsProcessed()
    .catch((e) => {
      job.fail(e);
      logger.error(`agenda.jobs.checkPayments: ${e}`);
    })
    .finally(done);
}
