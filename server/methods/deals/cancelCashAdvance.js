import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';
import Deals from '../../collections/deals';
import cancelTransfer from '../../dwolla/cancelTransfer';
import { Backups } from '../../collections/backups';
import logger from '../../logger/log';
import updateInteraction from '../users/updateInteraction';
import * as Sentry from '@sentry/node';
export default async function cancelDeal(id, reason) {
  const Deal = Deals.findOne({ _id: id });
  const { status, transferUrl } = Deal;

  if (status === 'active') throw new Meteor.Error('ALREADY_ACTIVE');

  try {
    if (transferUrl) await cancelTransfer(transferUrl);

    if (Backups.insert({ ...Deal, status: 'cancelled', cancelledAt: new Date() })) {
      await Deals.remove({
        _id: id
      });
    }

    updateInteraction({
      userId: Deal.userId,
      status: 'incomplete',
      flow: 'repetition',
      note: `deal was declined for ${reason}`.toUpperCase()
    });
    await Meteor.users.update(
      { _id: Deal.userId },
      {
        $set: {
          currentCashAdvance: false
        }
      }
    );
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`deals.cancel [${id}] ${JSON.stringify(error)}`);
    throw new Meteor.Error(error);
  }
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.cancel'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: function cancelDealMethod(id, reason) {
    check(id, String);
    Security.checkRole(Meteor.userId(), ['super-admin', 'admin', 'technical', 'manager']);
    return cancelDeal(id, reason);
  }
});
