/* eslint-disable no-param-reassign */
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import initiatePayment from '../../methods/deals/initiatePayment/initiatePayment';
import declinePaymentNSF from '../../methods/deals/declinePaymentNSF';
import logger from '../../logger/log';
// import checkAvailableBalance from '../../methods/users/checkAvailableBalance';

const JOB_NAME = 'initiatePayment';
const RUNNING_TIME = 'in 5 minutes';

function defineJob(Queue) {
  Queue.define(JOB_NAME, async (job, done) => {
    const { userId, dealId, paymentNumber, idempotencyKey } = job.attrs.data;

    try {
      check(job.attrs.data, {
        userId: String,
        dealId: String,
        paymentNumber: Number,
        idempotencyKey: String,
        amount: Number
      });

      // DISABLED FOR THE MOMENT
      // await checkAvailableBalance({ userID: userId }, amount);
      // await job.touch();

      const result = await initiatePayment(dealId, paymentNumber, idempotencyKey, null, true);
      job.attrs.results = result;
      done();
    } catch (err) {
      let error = err;
      if (error.error === 'INSUFFICIENT_FUNDS') {
        declinePaymentNSF(dealId, paymentNumber, userId);
      }

      if (err.body) error = err.body._embedded ? err.body._embedded.errors : err;
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
    logger.error(`initiatePayment ${error}`);
    throw new Meteor.Error(error);
  }
}

export default { JOB_NAME, defineJob, runJob };
