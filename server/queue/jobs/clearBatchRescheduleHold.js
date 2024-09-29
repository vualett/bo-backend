import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
const JOB_NAME = 'clearBatchRescheduleHold';

function defineJob(Queue) {
  Queue.define(JOB_NAME, async (job, done) => {
    const { userId } = job.attrs.data;
    try {
      Meteor.users.update({ _id: userId }, { $unset: { rescheduleHold: '' } });
      done();
    } catch (error) {
      job.fail(error);
      done();
    }
  });
}

async function runJob(Queue, item) {
  if (!item.userId) return;
  try {
    const job = await Queue.create(JOB_NAME, item);
    await job.schedule(`in 1 week`);
    await job.unique({ 'data.userId': item.userId });
    await job.save();
  } catch (error) {
    logger.error(`clearBatchRescheduleHold ${error}`);
    throw new Meteor.Error(`clearBatchRescheduleHold ${error}`);
  }
}

export default { JOB_NAME, defineJob, runJob };
