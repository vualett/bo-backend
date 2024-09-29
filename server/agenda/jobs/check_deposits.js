import batchCheckIfDepositProcessed from '../../methods/batch/checkIfDepositProcessed';
import logger from '../../logger/log';

export default function checkDeposits(job, done) {
  batchCheckIfDepositProcessed()
    .catch((e) => {
      job.fail(e);
      logger.error(`agenda.jobs.checkDeposits: ${e}`);
    })
    .finally(done);
}
