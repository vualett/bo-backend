import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { checkInvitationAndMarkIt } from '../invitations/invitation';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import { queueCheckMissingRequirements } from '../../queue/queue';
import sendVerificationEmail from './email/sendVerificationEmail';

async function createClientAccount(data) {
  try {

    if (data?.address?.state === 'VA') {
      throw new Meteor.Error('Error', 'Unavailable In Your Area');
    }

    const userId = await Accounts.createUser(data);

    await queueCheckMissingRequirements({ userId, schedule: 'in 6 hours' });

    Meteor.defer(async () => {
      await checkInvitationAndMarkIt(userId);
      await sendVerificationEmail({ userId });
    });

    return userId;
  } catch (error) {
    if (!['Email already exists. [403]', 'Account already exists with this number'].includes(error.message)) {
      Sentry.captureException(error);
      logger.error(`users.create [${data.email}] ${JSON.stringify(error)}`);
    }

    throw error;
  }
}

Meteor.methods({
  'users.create': createClientAccount
});
