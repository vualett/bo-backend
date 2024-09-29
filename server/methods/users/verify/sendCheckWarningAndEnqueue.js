import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../../utils/security';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Queue, { queueCheckUserAndSuspend } from '../../../queue/queue';
import updateInteraction from '../updateInteraction';
import logger from '../../../../server/logger/log';
import notifyUser from '../../../notifications/notifyUser';
import * as Sentry from '@sentry/node';
import { NotifyChannel } from '../../../notifications/notifyChannel';
import { STAGE, STATUS, ROLE } from '../../../consts/user';
import changeStatus from '../changeStatus';

export default async function sendCheckWarningAndEnqueue({ userId, type }) {
  check(userId, String);

  const user = Meteor.users.findOne({ _id: userId });

  if (!user) throw new Meteor.Error('USER NOT FOUND');

  if (!user?.phone?.number) throw new Meteor.Error('NO PHONE NUMBER');

  const existingJob = await Queue.jobs({
    name: 'checkUserAndSuspend',
    'data.userId': userId,
    nextRunAt: { $gt: new Date() }
  });

  if (!!existingJob && existingJob.length) throw new Meteor.Error('CHECK MESSAGE ALREADY SENT');

  try {

    await notifyUser({
      body: 'Your cash advance will be available before 6:00 pm EST! After this time it will be deactivated for security reasons. UALETT',
      service: 'accNotification',
      userId: user._id,
      channel: NotifyChannel.PUSH
    });

    if (type === 'user') {
      await updateInteraction({
        userId,
        status: 'check2',
        flow: ROLE.ONBOARDING,
      });
    } else {
      await updateInteraction({
        userId,
        status: 'check2',
        flow: ROLE.ONBOARDING,
        by: 'system'
      });
    }

    if (user?.offStage?.stage === STAGE.SALES.STAGE_6) {
      await changeStatus({
        userId,
        status: STATUS.SCHEDULED_DEACTIVATION
      });
    }

    await queueCheckUserAndSuspend({ userId, schedule: 'at 11pm' });

  } catch (err) {
    Sentry.captureException(err);
    logger.error(`users.sendCheckWarningAndEnqueue ${userId}`, err);
    throw new Meteor.Error('CHECK MESSAGE ALREADY SENT');
  }
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.sendCheckWarningAndEnqueue'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: function sendCheckWarningAndEnqueueMethod({ userId }) {
    Security.checkRole(this.userId, ['technical', 'admin', 'validation']);
    const type = 'user';
    return sendCheckWarningAndEnqueue({ userId, type });
  }
});
