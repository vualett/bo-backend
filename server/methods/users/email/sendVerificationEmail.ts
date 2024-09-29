/* eslint-disable no-unneeded-ternary */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import differenceInMinutes from 'date-fns/differenceInMinutes';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';

interface Parameters {
  userId: string;
  email?: string;
}

export default async function sendVerificationEmail(params: Parameters): Promise<void> {
  const { userId, email } = params;

  try {
    const user = await Meteor.users.findOneAsync({ _id: userId });

    if (!user) {
      throw new Meteor.Error(404, 'USER_NOT_FOUND!');
    }

    const { services } = user;

    const emailAddress = email
      ? email
      : user.emails && user.emails.length > 0
      ? user.emails[user.emails.length - 1].address
      : undefined;

    if (!emailAddress) {
      throw new Meteor.Error(404, 'EMAIL_ADDRESS_NOT_FOUND!');
    }

    if (services && services.email && services.email.verificationTokens.length > 0) {
      const verificationToken = services.email.verificationTokens[0];
      const diff = differenceInMinutes(new Date(), verificationToken.when);

      if (diff < 5) throw new Meteor.Error('Wait', `wait ${5 - diff} minutes`);
    }

    return Accounts.sendVerificationEmail(userId, emailAddress);
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;
    logger.error(`users.sendVerificationEmail ${message}`);
    Sentry.captureException(error);
    throw new Meteor.Error(500, 'Internal error');
  }
}

Meteor.methods({
  'users.sendVerificationEmail': async function sendVerificationEmailMethod(params: Parameters) {
    return await sendVerificationEmail(params);
  }
});
