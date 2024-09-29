import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { addDays, startOfDay } from 'date-fns';
import logger from '../../logger/log';
import Invitations from '../../collections/invitations';
import Security from '../../utils/security';
import createInvitation from './createInvitation';
import * as Sentry from '@sentry/node';

async function getTodaysInvitationsCount(userId) {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  return Invitations.find({ by: userId, when: { $gte: today, $lte: tomorrow } }).count();
}

async function invite({ phone, metadata }) {
  Security.checkLoggedIn(this.userId);
  check(phone, String);
  if (metadata) check(metadata, Object);

  const { firstName, lastName } = Meteor.users.findOne({ _id: this.userId });

  try {
    const results = await createInvitation({
      phone,
      by: metadata.friendId ?? this.userId,
      referral: {
        firstName,
        lastName,
        _id: this.userId
      },
      metadata
    });

    if (!results) return false;

    results.todaysCount = await getTodaysInvitationsCount(this.userId);

    return results;
  } catch (error) {
    if (error.message !== 'Error: [USER ALREADY INVITED]') {
      logger.error(`[invitations.create] [(***) ***-${phone.slice(-4)}] ${error}`);
      Sentry.captureException(error);
    }

    throw new Meteor.Error(error.message || 'Something went wrong', error);
  }
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'invitations.create',
  clientAddress: () => true
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: invite
});
