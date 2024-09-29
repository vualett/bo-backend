import { Meteor } from 'meteor/meteor';
import assignAgent from '../../methods/validation/assignAgent';
import logger from '../../logger/log';
const JOB_NAME = 'reevaluateClient';

function defineJob(Queue) {
  Queue.define(JOB_NAME, async (job, done) => {
    const { userId } = job.attrs.data;

    try {
      const set = {
        'status.qualify': true,
        'status.verified': false,
        'status.preVerified': false,
        'status.unqualifiedReason': ''
      };

      Meteor.users.update({ _id: userId }, { $set: set });
      const user = Meteor.users.findOne({ _id: userId });
      if (
        user.metrics &&
        (!user.metrics.cashAdvances || user.metrics.cashAdvances.count == null || user.metrics.cashAdvances.count <= 0)
      ) {
        assignAgent({
          userId,
          category: 'seniorUnderwriter'
        });
      } else {
        assignAgent({
          userId,
          category: 'validate'
        });
      }
      done();
    } catch (error) {
      logger.error(`reevaluateClient ${error}`);
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
    logger.error(`reevaluateClient ${error}`);
    throw new Meteor.Error(error);
  }
}

export default { JOB_NAME, defineJob, runJob };
