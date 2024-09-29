import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import Security from '../../utils/security';

const addBankruptcy = async (userId: string): Promise<void> => {
  Security.checkRole(Meteor.userId(), ['overdue']);
  check(userId, String);
  try {
    const user = await Meteor.users.findOneAsync({ _id: userId });

    if (!user) throw new Meteor.Error('USER_NOT_FOUND');

    const userModified: Mongo.Modifier<Meteor.User> = {
      $set: {
        isInBankruptcy: true
      }
    };

    await Meteor.users.updateAsync({ _id: userId }, userModified);
  } catch (error) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`users.addBankruptcy [${userId}] ${message}`);
  }
};

export default addBankruptcy;

Meteor.methods({
  'users.addBankruptcy': addBankruptcy
});
