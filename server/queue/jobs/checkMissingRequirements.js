import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import isToday from 'date-fns/isToday';
import isYesterday from 'date-fns/isYesterday';
import differenceInDays from 'date-fns/differenceInDays';
import { queueCheckMissingRequirements } from '../queue';
import notifyUser from '../../notifications/notifyUser';
import { NotifyChannel } from '../../notifications/notifyChannel';
const JOB_NAME = 'checkMissingRequirements';

function defineJob(Queue) {
  Queue.define(JOB_NAME, async (job, done) => {
    const { userId } = job.attrs.data;
    try {
      // eslint-disable-next-line no-console
      const result = Meteor.users
        .find({
          _id: userId,
          'status.qualify': true,
          'status.verified': false,
          'status.notInterested': false,
          $or: [{ hasFunding: false }, { hasDriverLicense: false }, { 'emails.verified': false }]
        })
        .fetch();
      if (
        result &&
        ((result[0]?.createdAt !== undefined && isYesterday(result[0]?.createdAt)) ||
          (result[0]?.createdAt !== undefined && isToday(result[0]?.createdAt)) ||
          (result[0]?.createdAt !== undefined && differenceInDays(result[0]?.createdAt, new Date()) <= 5))
      ) {
        // eslint-disable-next-line no-console

        await notifyUser({
          body: 'Looks like your profile is almost ready! Complete it now and get your Deal, Can`t wait to see you on board!',
          service: 'We`re Excited to Have You!',
          userId,
          channel: NotifyChannel.PUSH
        });

        queueCheckMissingRequirements({ userId: userId, schedule: 'in 24 hours' });
        queueCheckMissingRequirements({ userId: userId, schedule: 'in 48 hours' });
        done();
      }
      Queue.cancel({ name: 'checkIfDealIsNotTaken', 'data.userId': userId });
      done();
    } catch (error) {
      // eslint-disable-next-line no-console
      done();
    }
  });
}

async function runJob(Queue, item) {
  if (!item.userId || !item.schedule) return;

  try {
    const job = await Queue.create(JOB_NAME, item);
    await job.schedule(item.schedule);
    await job.unique({ 'data.userId': item.userId });
    await job.save();
  } catch (error) {
    logger.error(`checkIfDealIsNotTaken ${error}`);
    throw new Meteor.Error(error);
  }
}

export default { JOB_NAME, defineJob, runJob };
