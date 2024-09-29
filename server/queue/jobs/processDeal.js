import { Meteor } from 'meteor/meteor';
import processDeal from '../../methods/deals/processDeal/processDeal';
import logger from '../../logger/log';
const JOB_NAME = 'processDeal';

function defineJob(Queue) {
  Queue.define(JOB_NAME, async (job, done) => {
    const { dealId } = job.attrs.data;

    try {
      const result = await processDeal(dealId);
      done(result);
    } catch (error) {
      job.fail(error);
      done();
    }
  });
}

async function runJob(Queue, item) {
  if (!item.dealId) return;
  try {
    const job = await Queue.create(JOB_NAME, item);
    await job.schedule('in 1 minute');
    await job.unique({ 'data.dealId': item.dealId });
    await job.save();
  } catch (error) {
    logger.error(`processDeal ${error}`);
    throw new Meteor.Error(error);
  }
}

export default { JOB_NAME, defineJob, runJob };
