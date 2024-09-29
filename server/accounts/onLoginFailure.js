import { Accounts } from 'meteor/accounts-base';
import logger from '../logger/log';

Accounts.onLoginFailure((user) => {
  if ([
    'User not found',
    'Verify email link expired',
    'Token expired',
    'Incorrect password',
    'Your account is pending for deletions.',
    'You\'ve been logged out by the server. Please log in again.'
  ].includes(user.error.reason)) { return; }

  logger.error(`[LOGIN FAILED] [${user.connection?.clientAddress}] ${user.error.reason}`);
});
