import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { insertTimelog } from '../timelogs/insertTimelog';
import capitalizeFirstLetterOfEachWord from '../../utils/capitalizeFirstLetterOfEachWord';
import { SUB_STATUS, ROLE } from '../../consts/user';
import { insertNote } from '../notes';
import updateInteraction from './updateInteraction';
import { isValid } from 'date-fns';

interface Params {
  userId: string;
  agentId: string | undefined | null;
  subStatus: string | undefined | null;
  callbackDate: Date | undefined | null;
}

const changeSubStatus = async (props: Params): Promise<void> => {
  const { userId, subStatus, agentId, callbackDate } = props;
  try {
    const user = await Meteor.users.findOneAsync({ _id: userId });

    if (!user) throw new Meteor.Error('USER_NOT_FOUND');

    if (!subStatus) {
      const unsetUser: Mongo.Modifier<Meteor.User> = {
        $unset: {
          'offStage.subStatus': ''
        }
      };

      await Meteor.users.updateAsync({ _id: userId }, unsetUser);
      return;
    }

    const userModified: Mongo.Modifier<Meteor.User> = {
      $set: {
        'offStage.subStatus': subStatus
      }
    };

    await Meteor.users.updateAsync({ _id: userId }, userModified);

    const _by = await Meteor.users.findOneAsync({ _id: agentId ?? '' });

    const responsable = _by
      ? {
          name: capitalizeFirstLetterOfEachWord(`${_by.firstName} ${_by.lastName}`),
          id: _by._id
        }
      : { name: 'system' };

    await insertTimelog({
      userId,
      dealId: null,
      event: `Sub-status changed to ${subStatus}`,
      type: 'account',
      eventType: 'user',
      _by: responsable,
      metadata: undefined
    });

    if (
      callbackDate &&
      isValid(new Date(callbackDate)) &&
      (subStatus === SUB_STATUS.SCHEDULE_WITH_CUSTOMER || subStatus === SUB_STATUS.CALL_IN_FUTURE)
    ) {
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
        flow: ROLE.ONBOARDING,
        callbackDate: new Date(callbackDate),
        by: responsable,
        reevaluationDate: null,
        note: null,
        duplicatedAccountId: null,
        userAdmin: null,
        hasUpdateDealInteraction: null
      });
    }

    if (subStatus === SUB_STATUS.IDV_FRAUD) {
      insertNote({
        message: 'Customer has been marked as IDV Fraud!',
        where: 'user',
        userId: user._id,
        by: responsable
      });
    }
  } catch (error) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`users.changeSubStatus [${userId}] ${message}`);
  }
};

export default changeSubStatus;

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.changeSubStatus'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: changeSubStatus
});
