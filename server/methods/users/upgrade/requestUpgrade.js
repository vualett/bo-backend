import { Meteor } from 'meteor/meteor';
import Security from '../../../utils/security';
import assignAgent from '../../validation/assignAgent';
import checkIfValidAndRequestAssetReport from '../plaid/checkIfValidAndRequestAssetReport';
import updateInteraction from '../updateInteraction';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';
import { STAGE, STATUS, SUB_STATUS, ROLE } from '../../../consts/user';
import changeStatus from '../changeStatus';
import changeSubStatus from '../changeSubStatus';
import capitalizeFirstLetterOfEachWord from '../../../utils/capitalizeFirstLetterOfEachWord';
import { insertTimelog } from '../../timelogs/insertTimelog';
import { check } from 'meteor/check';

async function requestUpgrade(userId) {
  const query = {};
  if (!userId) { // means it was called from the client
    Security.checkLoggedIn(Meteor.userId());
    query._id = Meteor.userId();
  } else { // means it was called from the agent
    check(userId, String);
    query._id = userId;
  }

  try {
    const user = Meteor.users.findOne(query);

    if (user.upgradeEnabled) {
      if (user?.currentCashAdvance?.status === 'active') {
        throw new Meteor.Error('YOU HAVE ACTIVE CASHADVANCE');
      }
      if (user?.disabled === true) {
        throw new Meteor.Error(' ACCOUNT IS PENDING TO DELETE');
      }

      Meteor.users.update(query, {
        $unset: { upgradeEnabled: '' },
        $set: {
          'status.upgradeRequested': true
        }
      });

      if (
        user.metrics &&
        (!user.metrics.cashAdvances || user.metrics.cashAdvances.count == null || user.metrics.cashAdvances.count <= 0)
      ) {
        assignAgent({
          userId: user._id,
          category: 'seniorUnderwriter'
        });
      } else {
        assignAgent({
          userId: user._id,
          category: 'escalate'
        });
      }

      updateInteraction({
        userId: user._id,
        status: 'escalate',
        by: {
          name: 'system'
        },
        flow: ROLE.REPETITION
      });

      await insertTimelog({
        userId: user._id,
        event: 'upgrade requested',
        type: 'account',
        eventType: 'user',
        _by: !userId ? {
          id: user._id,
          name: capitalizeFirstLetterOfEachWord(`${user.firstName} ${user.lastName}`)
        } : {
          id: Meteor.userId(),
          name: capitalizeFirstLetterOfEachWord(`${Meteor.user().firstName} ${Meteor.user().lastName}`)
        }
      });

      await checkIfValidAndRequestAssetReport(user);

      if (user?.offStage?.stage === STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10) {
        await changeStatus({
          userId: user._id,
          agentId: !userId ? user._id : Meteor.userId(),
          status: STATUS.UPGRADE
        });
        await changeSubStatus({
          userId: user._id,
          agentId: !userId ? user._id : Meteor.userId(),
          subStatus: SUB_STATUS.WAITING_FOR_UW_REVIEW
        });
      }
    }
    else {
      throw new Meteor.Error('UPGRADE IS NOT ENABLED');
    }
  } catch (error) {
    logger.error(`users.requestUpgrade [${query._id}] ${error}`);
    Sentry.captureException(error, { extra: query._id });
    throw error;
  }
}

Meteor.methods({ 'users.requestUpgrade': requestUpgrade });
