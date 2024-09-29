import { Job } from '@hokify/agenda';
import logger from '../../logger/log';
import { Meteor } from 'meteor/meteor';
import { checkPaymentsNotInit } from '../../methods/deals/checkPaymentsNotInit';
export default async function paymentsNotStarted(job: Job, done: () => void): Promise<void> {
  try {
    await checkPaymentsNotInit();
    done();
  } catch (error) {
    const { message } = error as Meteor.Error;
    job.fail(message);
    logger.error(`Error running job paymentsNotStart: ${message}`);
    done();
  }
}
