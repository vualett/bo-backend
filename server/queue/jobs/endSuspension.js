import { Meteor } from 'meteor/meteor';
import assignAgent from '../../methods/validation/assignAgent';
import logger from '../../logger/log';
const JOB_NAME = 'endSuspension';

function defineJob(Queue) {
  Queue.define(JOB_NAME, async (job, done) => {
    const { userId } = job.attrs.data;
    const query = { _id: userId };

    try {
      const user = await Meteor.users.findOneAsync(query);

      if (user.deleteRequest) {
        throw new Meteor.Error('Account pending for eliminations');
      }

      if (user.deletedAt) {
        throw new Meteor.Error('Account deleted');
      }

      if (user.category === 'none') {
        const set = {
          'status.qualify': true,
          'status.verified': false,
          'status.preVerified': false,
          'status.unqualifiedReason': ''
        };

        Meteor.users.update({ _id: userId }, { $set: set, $unset: { suspendedTill: '' } });
        if (user.metrics && user.metrics.cashAdvances && user.metrics.cashAdvances.count <= 0) {
          assignAgent({
            userId,
            category: 'seniorUnderwriter'
          });
        } else {
          assignAgent({
            userId,
            category: 'reactivate'
          });
        }
      } else {
        Meteor.users.update({ _id: userId }, { $unset: { suspendedTill: '' } });
      }

      done();
    } catch (error) {
      logger.error(`endSuspension ${error}`);
      job.fail(error);
      done();
    }
  });
}

async function runJob(Queue, item) {
  if (!item.userId) return;
  try {
    const job = await Queue.create(JOB_NAME, item);
    await job.schedule(`in ${item.weeks} week`);
    await job.unique({ 'data.userId': item.userId });
    await job.save();
  } catch (error) {
    logger.error(`endSuspension ${error}`);
    throw new Meteor.Error(error);
  }
}

export default { JOB_NAME, defineJob, runJob };
