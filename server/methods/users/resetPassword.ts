import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import logger from '../../logger/log';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { differenceInDays } from 'date-fns';
import insertLog from '../logs/insertGenericLog';

async function resetPassword(token: string, newPassword: string) {
  try {
    const user = Meteor.users.findOne({ 'services.password.reset.token': token });

    const diffDays = differenceInDays(new Date(), new Date(user?.services?.password?.reset?.createdAt));

    if (!user || diffDays > 0) throw new Meteor.Error('Token expired');

    Accounts.setPassword(user._id, newPassword, { logout: true });
    insertLog(user._id, 'Password successfully changed');
    return true;
  } catch (error: any) {
    const { message } = error as Error;
    logger.error(`users.resetPassword:${message}`);
    if (error.error === 'Token expired') throw new Meteor.Error('Token expired', 'You must request another link');
    throw new Meteor.Error('Try again later');
  }
}

// DEFINING METHOD

const method = {
  type: 'method',
  name: 'users.resetPassword',
  clientAddress: () => true
};

DDPRateLimiter.addRule(method, 1, 10000);

Meteor.methods({ [method.name]: resetPassword });
