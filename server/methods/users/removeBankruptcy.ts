import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import Security from '../../utils/security';

const removeBankruptcy = async (userId: string): Promise<void> => {
  Security.checkAccess(Meteor.userId(), ['removeBankruptcy']);
  check(userId, String);
  try {
    const user = await Meteor.users.findOneAsync({ _id: userId });

    if (!user) throw new Meteor.Error('USER_NOT_FOUND');

    const userModified: Mongo.Modifier<Meteor.User> = {
      $unset: {
        isInBankruptcy: ''
      }
    };

    await Meteor.users.updateAsync({ _id: userId }, userModified);
  } catch (error) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`users.removeBankruptcy [${userId}] ${message}`);
  }
};

export default removeBankruptcy;

Meteor.methods({
  'users.removeBankruptcy': removeBankruptcy
});
