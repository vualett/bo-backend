import { Meteor } from 'meteor/meteor';
import { sendWebNotification } from '../../webNotifications';
import subMinutes from 'date-fns/subMinutes';
import logger from '../../logger/log';
const JOB_NAME = 'callbackNotification';

function defineJob(Queue) {
  Queue.define(JOB_NAME, async (job, done) => {
    const { by, name, callbackTo, uniqueId } = job.attrs.data;

    try {
      sendWebNotification(by.id, {
        title: 'Callback',
        body: `You have a callback in 5 min to ${callbackTo} ${name} Link: https://backoffice.ualett.com/user/${uniqueId}`
      });

      done();
    } catch (error) {
      logger.error(`[FUNCTION:callbackNotification] ${error}`);
      job.fail(error);
      done();
    }
  });
}

async function runJob(Queue, item) {
  if (!item.uniqueId || !item.by || !item.callbackDate) return;
  try {
    const job = await Queue.create(JOB_NAME, item);
    await job.schedule(subMinutes(item.callbackDate, 5));
    await job.unique({
      'data.uniqueId': item.uniqueId,
      'data.by.id': item.by.id
    });
    await job.save();
  } catch (error) {
    logger.error(`[FUNCTION:callbackNotification] ${error}`);
    throw new Meteor.Error(error);
  }
}

export default { JOB_NAME, defineJob, runJob };
