import { Meteor } from 'meteor/meteor';
import madePayment from '../../methods/deals/madePayment';
import logger from '../../logger/log';
const JOB_NAME = 'processPayment';
const RUNNING_TIME = 'in 10 seconds';

function defineJob(Queue) {
  Queue.define(JOB_NAME, async (job, done) => {
    const { dealId, paymentNumber, transferUrl } = job.attrs.data;

    try {
      await madePayment(dealId, Number(paymentNumber), true, transferUrl);
      done();
    } catch (error) {
      logger.error(`processPayment ${error}`);
      job.fail(error);
      done();
    }
  });
}

async function runJob(Queue, item) {
  if (!item.dealId) return;
  try {
    const job = await Queue.create(JOB_NAME, item);
    await job.schedule(RUNNING_TIME);
    await job.unique({
      'data.dealId': item.dealId,
      'data.paymentNumber': item.paymentNumber
    });
    await job.save();
  } catch (error) {
    logger.error(`processPayment ${error}`);
    throw new Meteor.Error(error);
  }
}

export default { JOB_NAME, defineJob, runJob };
