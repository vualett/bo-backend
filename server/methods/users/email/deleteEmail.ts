import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';
import Security from '../../../utils/security';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';

function deleteEmail(id: string, email: string): boolean | Error {
  Security.checkRole(Meteor.userId(), ['super-admin', 'technical', 'manager']);
  check(id, String);
  check(email, String);

  try {
    const user = Meteor.users.findOne({ _id: id, 'emails.address': email });

    if (user == null || user === undefined) {
      throw new Meteor.Error('User not found');
    }

    const verifiedEmails = user.emails?.filter((element) => element.address !== email && element.verified);

    if (verifiedEmails?.length === 0) {
      throw new Meteor.Error('User must have at least one verified email');
    }

    Accounts.removeEmail(user._id, email);
    return true;
  } catch (error) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`users.deleteEmail:${message}`);
    throw error;
  }
}

Meteor.methods({ 'users.deleteEmail': deleteEmail });
