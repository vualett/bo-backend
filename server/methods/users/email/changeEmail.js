import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';
import Security from '../../../utils/security';
import sendVerificationEmail from './sendVerificationEmail';
import logger from '../../../logger/log';

async function changeEmail(userId, newEmail) {
  check(userId, String);
  check(newEmail, String);

  Security.checkRole(Meteor.userId(), ['super-admin', 'admin', 'manager', 'support']);

  await Accounts.addEmail(userId, newEmail);
}

async function userChangeEmail(newEmail) {
  try {
    check(newEmail, String);

    Security.checkLoggedIn(this.userId);

    await Accounts.addEmail(this.userId, newEmail);

    await sendVerificationEmail({ userId: this.userId, email: newEmail });

    return true;
  } catch (error) {
    logger.error(`An error occurred while changing the email: user: ${this.userId} error: ${error}`);
    console.error('An error occurred while changing the email:', error);
    throw new Meteor.Error('EMAIL_CHANGE_FAILED', 'Something went wrong changing email. Please contact support.');
  }
}

Meteor.methods({
  'users.changeEmail': changeEmail,
  'user.changeEmail': userChangeEmail
});
