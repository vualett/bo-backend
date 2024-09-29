import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import insertLog from '../logs/insertGenericLog';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import notifyUser from '../../notifications/notifyUser';
import { NotifyChannel } from '../../notifications/notifyChannel';

async function resetPasswordViaSMS(userID) {
  try {
    await Accounts.sendResetPasswordEmail(userID);
    const user = Meteor.users.findOne({ _id: userID });

    const { reset } = user.services.password;

    if (reset) {
      const firstName = user.firstName || '';
      const url = `https://app.ualett.com/reset-password/${reset.token}`;

      await notifyUser({
        body: `hi ${firstName}, Use this link to reset your ualett password: ${url}`,
        service: 'customerCare',
        userId: user._id,
        to: user.phone.number,
        channel: NotifyChannel.SMS
      });

      insertLog(userID, 'Reset password link sent via Notification');
    }
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`users.resetPasswordViaSMS [${userID}] ${error}`);
  }
}

Meteor.methods({ 'users.resetPasswordViaSMS': resetPasswordViaSMS });
