import { Meteor } from 'meteor/meteor';

import logger from '../../logger/log';
import categorization from '../../methods/users/categorization';
import subMonths from 'date-fns/subMonths';
import Deals from '../../collections/deals';
const JOB_NAME = 'checkIfDealIsNotTaken';
function defineJob(Queue: any) {
  Queue.define(JOB_NAME, async (job, done) => {
    const { userId, schedule } = job.attrs.data;
    //const query = { _id: userId };
    const lastTreMonths = subMonths(new Date(), 3);
    const InfoDeal = Deals.findOne({ userId: userId, createdAt: { $gte: lastTreMonths }, status: 'active' });
    try {
      // const user = await Meteor.users.findOne(query);
      if (!InfoDeal) {
        categorization(userId, '3 months inactive');
      }
      done();
    } catch (error) {
      const { message } = error as Error;
      logger.error(`checkIfDealIsNotTaken ${message}`);
      job.fail(`checkIfDealIsNotTaken ${error}`);
      done();
    }
  });
}

async function runJob(Queue: any, item: any) {
  if (!item.userId || !item.schedule) return;

  try {
    const job = await Queue.create(JOB_NAME, item);
    await job.schedule(item.schedule);
    await job.unique({ 'data.userId': item.userId });
    await job.save();
  } catch (error) {
    const { message } = error as Error;
    logger.error(`checkIfDealIsNotTaken ${message}`);
    throw new Meteor.Error(error);
  }
}

export default { JOB_NAME, defineJob, runJob };
