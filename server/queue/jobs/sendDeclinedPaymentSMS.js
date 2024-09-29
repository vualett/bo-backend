import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import { ENV } from '../../keys';
import Deals from '../../collections/deals';
import { NotifyChannel } from '../../notifications/notifyChannel';
import notifyUser from '../../../server/notifications/notifyUser';
const JOB_NAME = 'sendDeclinedPaymentSMS';
const RUNNING_TIME = ENV === 'production' ? 'in 24 hours' : 'in 10 seconds';

function defineJob(Queue) {
  Queue.define(JOB_NAME, async (job, done) => {
    const { dealId, userId, paymentNumber, notifyUserBody } = job.attrs.data;
    try {
      const deal = Deals.findOne({ _id: dealId });
      const payment = deal.payments.filter((p) => p.number === paymentNumber)[0];

      if (payment.status === 'declined') {
        await notifyUser({
          body: notifyUserBody,
          service: 'accNotification',
          userId,
          channel: NotifyChannel.SMS
        });
      }

      done();
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
    await job.schedule(`${RUNNING_TIME}`);
    await job.unique({ 'data.dealId': item.dealId, 'data.paymentNumber': item.paymentNumber });
    await job.save();
  } catch (error) {
    logger.error(`sendDeclinedPaymentSMS ${error}`);
    throw new Meteor.Error(error);
  }
}

export default { JOB_NAME, defineJob, runJob };
