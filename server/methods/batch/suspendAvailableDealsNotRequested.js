import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import Security from '../../utils/security';
import { asyncForEach } from '../../utils/utils';
import logger from '../../logger/log';
import differenceInDays from 'date-fns/differenceInDays';
import insertLog from '../logs/insertGenericLog';
import * as Sentry from '@sentry/node';
export default async function suspendAvailableDealsNotRequested() {
  try {
    const users = await Meteor.users.find({ category: { $ne: 'none' }, currentCashAdvance: false }).fetch();

    let affectedUsers = 0;

    await asyncForEach(users, async (user) => {
      const deal = await Deals.findOne({ userId: user._id }, { sort: { createdAt: -1 } });

      if (deal && deal.status === 'completed' && differenceInDays(new Date(), deal.completeAt) > 30) {
        await Meteor.users.update({ _id: user._id }, { $set: { category: 'none' } });

        affectedUsers++;

        insertLog(user._id, 'SUSPENDED FOR INACTIVITY');

        Meteor.call('timelogs.insert', {
          userId: user._id,
          event: 'SUSPENDED FOR INACTIVITY',
          type: 'account',
          eventType: 'user',
          metadata: {
            type: 'suspended'
          }
        });
      }
    });

    return affectedUsers;
  } catch (error) {
    logger.error(`batch.suspendAvailableDealsNotRequested: ${error}`);
    Sentry.captureException(error);
    throw new Meteor.Error(error);
  }
}

Meteor.methods({
  'batch.suspendAvailableDealsNotRequested': async function suspendAvailableDealsNotRequestedMethod() {
    Security.checkRole(this.userId, ['super-admin']);
    return await suspendAvailableDealsNotRequested();
  }
});
