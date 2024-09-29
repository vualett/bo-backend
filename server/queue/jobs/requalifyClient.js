import { Meteor } from 'meteor/meteor';
import { requalifyUser } from '../../methods/users/qualifyUser';
import logger from '../../logger/log';
const JOB_NAME = 'requalifyClient';

function defineJob(Queue) {
  Queue.define(JOB_NAME, async (job, done) => {
    const { userId } = job.attrs.data;
    try {
      const result = requalifyUser({ userId });
      done(result);
    } catch (error) {
      logger.error(`requalifyClient ${error}`);
      job.fail(error);
      done();
    }
  });
}

async function runJob(Queue, item) {
  if (!item.userId || !item.reevaluationDate) return;
  try {
    const job = await Queue.create(JOB_NAME, item);
    await job.schedule(item.reevaluationDate);
    await job.unique({ 'data.userId': item.userId });
    await job.save();
  } catch (error) {
    logger.error(`requalifyClient ${error}`);
    throw new Meteor.Error(error);
  }
}

export default { JOB_NAME, defineJob, runJob };
