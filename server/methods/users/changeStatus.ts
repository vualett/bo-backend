/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import { Mongo } from 'meteor/mongo';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { insertTimelog } from '../timelogs/insertTimelog';
import capitalizeFirstLetterOfEachWord from '../../utils/capitalizeFirstLetterOfEachWord';
import { STATUS, ROLE } from '../../consts/user';
import { insertNote } from '../notes';
import { queueMarkUserAsInfoNeededNotProvided } from '../../../server/queue/queue';
import updateInteraction from './updateInteraction';
import { isValid } from 'date-fns';

const IDVStatus = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING_REVIEW: 'pending_review',
  ACTIVE: 'active'
};

interface Params {
  userId: string;
  status: string;
  agentId: string | undefined | null;
  callbackDate: Date | undefined | null;
}

const changeStatus = async (props: Params): Promise<void> => {
  const { userId, status, agentId, callbackDate } = props;
  try {
    const user = await Meteor.users.findOneAsync({ _id: userId });

    if (!user) throw new Meteor.Error('USER_NOT_FOUND');

    const _by = await Meteor.users.findOneAsync({ _id: agentId ?? '' });

    const responsable = _by
      ? {
          name: capitalizeFirstLetterOfEachWord(`${_by.firstName} ${_by.lastName}`),
          id: _by._id
        }
      : { name: 'system' };

    const userModified: Mongo.Modifier<Meteor.User> = {};
    userModified.$set = {
      'offStage.status': status
    };
    userModified.$unset = {
      'offStage.subStatus': ''
    };

    if (status === STATUS.NEED_MORE_INFO) {
      userModified.$set['offStage.needMoreInfoDate'] = new Date();
      await queueMarkUserAsInfoNeededNotProvided(userId);
    }
    if (status === STATUS.INFO_SUBMITTED) {
      userModified.$unset['offStage.needMoreInfoDate'] = '';
    }

    await Meteor.users.updateAsync({ _id: userId }, userModified);

    await insertTimelog({
      userId,
      dealId: null,
      event: `Status changed to ${status}`,
      type: 'account',
      eventType: 'user',
      _by: responsable,
      metadata: null
    });

    if (callbackDate && isValid(new Date(callbackDate)) && status === STATUS.CALLBACK_SCHEDULED) {
      await Meteor.users.updateAsync(
        { _id: userId },
        {
          $set: {
            'offStage.callbackDate': new Date(callbackDate)
          }
        }
      );

      await updateInteraction({
        userId,
        status: 'callback',
        flow: ROLE.REPETITION,
        callbackDate: new Date(callbackDate),
        hasUpdateDealInteraction: true,
        by: responsable,
        reevaluationDate: null,
        note: null,
        duplicatedAccountId: null,
        userAdmin: null
      });
    }

    if ((status === STATUS.IDV_FAILED || status === STATUS.IDV_PENDING_REVIEW) && agentId) {
      await Meteor.users.updateAsync(
        { _id: userId },
        {
          $set:
            status === STATUS.IDV_FAILED
              ? {
                  'identityVerification.status': IDVStatus.FAILED,
                  'identityVerification.attempts': 3,
                  'identityVerification.updatedAt': new Date(),
                  'identityVerification.previousStatus': user.identityVerification?.status
                }
              : {
                  'identityVerification.status': IDVStatus.PENDING_REVIEW,
                  'identityVerification.attempts': 1,
                  'identityVerification.updatedAt': new Date(),
                  'identityVerification.previousStatus': user.identityVerification?.status
                }
        }
      );

      insertNote({
        message: `Customer has been marked as ${status}`,
        where: 'user',
        userId: user._id,
        by: responsable
      });
    }
  } catch (error) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`users.changeStatus [${userId}] ${message}`);
  }
};

export default changeStatus;

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.changeStatus'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: changeStatus
});
