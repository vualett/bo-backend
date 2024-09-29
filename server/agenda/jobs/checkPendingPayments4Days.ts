import { checkPendingPayments } from '../../methods/deals/checkPendingPayments';
import { Job } from '@hokify/agenda';
import { Meteor } from 'meteor/meteor';
import logger from '../../../server/logger/log';
export default async function checkPendingPayments4Days(job: Job, done: () => void): Promise<void> {
  try {
    await checkPendingPayments();
    done();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;

    job.fail(message);
    logger.error(`Error running job checkPendingPayments4Days: ${message}`);

    done();
  }
}
