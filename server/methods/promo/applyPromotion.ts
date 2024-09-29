import { Meteor } from 'meteor/meteor';
import * as Sentry from '@sentry/node';
import logger from '../../logger/log';
import Promotions from '../../collections/promotions';
import insertLog from '../logs/insertGenericLog';

const applyPromotionUsers = ({ promotionId, userIds }: { promotionId: string; userIds: string[] }): void | never => {
  userIds.forEach((userId) => applyPromotionUser({ promotionId, userId }));
};

const applyPromotionUser = ({ promotionId, userId }: { promotionId: string; userId: string }): void | never => {
  try {
    const user = Meteor.users.findOne({ _id: userId });

    if (user === undefined) {
      throw new Meteor.Error(`User ${userId} does not exist`);
    }

    if (user.promotionDetail !== undefined) {
      throw new Meteor.Error(`User ${userId} already has a promotion applied`);
    }

    const promotion = Promotions.findOne({ _id: promotionId });

    if (promotion === undefined) {
      throw new Meteor.Error(`Promotion ${promotionId} does not exist`);
    }

    const promotionDetail = {
      _id: promotionId,
      count: 0
    };

    Meteor.users.update({ _id: userId }, { $set: { promotionDetail } });

    insertLog(userId, `(${promotion.name}) promotion was added!`, Meteor.userId());
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`[${userId}] ${JSON.stringify(error)}`);
    throw error;
  }
};

const verifyUsersValid = (
  userIds: string[]
): {
  success: number;
  failures: number;
  total: number;
  validUsersIds: string[];
} => {
  const total = userIds.length;

  const validUsersIds = userIds.filter((userId) => Meteor.users.findOne({ _id: userId }) !== undefined);

  return {
    success: validUsersIds.length,
    failures: total - validUsersIds.length,
    total,
    validUsersIds
  };
};

Meteor.methods({
  'promotion.applyPromotionUsers': applyPromotionUsers,
  'promotion.applyPromotionUser': applyPromotionUser,
  'promotion.verifyUsersValid': verifyUsersValid
});
