import { Meteor } from 'meteor/meteor';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { STATUS } from '../../../consts/user';

const setNeedMoreInfo = async (userId: string): Promise<void> => {
  try {
    check(userId, String);

    const user = Meteor.users.findOne({ _id: userId });

    if (!user) throw new Meteor.Error('USER_NOT_FOUND');

    const userModified: Mongo.Modifier<Meteor.User> = {
      $set: {
        'offStage.status': STATUS.NEED_MORE_INFO
      }
    };

    await Meteor.users.updateAsync({ _id: userId }, userModified);
  } catch (error) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`users.set.needMoreInfo [${userId}] ${message}`);
  }
};

export default setNeedMoreInfo;

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.set.needMoreInfo'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: setNeedMoreInfo
});
