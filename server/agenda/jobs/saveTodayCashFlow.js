import logger from '../../logger/log';
import { subDays } from 'date-fns';
import { generateDayCashFlowReport } from '../../methods/accounting/getCashFlow';
import * as Sentry from '@sentry/node';
export default async function saveTodayCashFlow(job, done) {
  try {
    const result = await generateDayCashFlowReport({
      day: subDays(new Date(), 1)
    });
    if (result) {
      done();
    } else {
      throw new Error('Nothing returned');
    }
  } catch (error) {
    job.fail(error);
    Sentry.captureException(error);
    logger.error(`agenda.jobs.saveTodayCashFlow: ${error}`);
    done();
  }
}
