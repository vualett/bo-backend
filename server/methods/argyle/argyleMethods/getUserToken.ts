/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { Meteor } from 'meteor/meteor';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';
import ArgyleApi from '../argyleAPI';

export default async function getUserToken(userId: string): Promise<{ user_token: string } | unknown> {
  try {
    const user = Meteor.users.findOne(userId);
    if (!user) {
      throw new Meteor.Error('USER_NOT_FOUND');
    }

    const argyleInUser = user.argyle;

    if (argyleInUser) {
      const argyleUserToken = await ArgyleApi.createUserToken(argyleInUser.id as string);
      return argyleUserToken;

    } else {

      const argyleUser = await ArgyleApi.createUser();
      if (!argyleUser) { throw new Meteor.Error('ARGYLE_USER_NOT_CREATED'); }

      Meteor.users.update(
        { _id: userId },
        { $set: { 'argyle.id': argyleUser.id } }
      );

      return argyleUser;

    }
  } catch (error) {
    const { message } = error as Meteor.Error;
    logger.error(`getUserToken: ${userId} [${message}]`);
    Sentry.captureException(error, { extra: { userId } });
  }
}

