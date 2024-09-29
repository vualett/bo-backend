import { Meteor } from 'meteor/meteor';
import Security from '../../../utils/security';
import assignAgent from '../../validation/assignAgent';
import checkIfValidAndRequestAssetReport from '../plaid/checkIfValidAndRequestAssetReport';
import updateInteraction from '../updateInteraction';
import automaticReactivation from './automaticReactivation';
import insertLog from '../../logs/insertGenericLog';
import { insertTimelog } from '../../timelogs/insertTimelog';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';
import { STAGE, STATUS, SUB_STATUS, ROLE } from '../../../consts/user';
import changeStatus from '../changeStatus';
import changeSubStatus from '../changeSubStatus';
import capitalizeFirstLetterOfEachWord from '../../../utils/capitalizeFirstLetterOfEachWord';
import { check } from 'meteor/check';

async function requestReactivation(userId) {
  const query = {};
  if (!userId) { // means it was called from the client
    Security.checkLoggedIn(Meteor.userId());
    query._id = Meteor.userId();
  } else { // means it was called from the agent
    check(userId, String);
    query._id = userId;
  }

  const user = Meteor.users.findOne(query);

  try {

    if (!user) {
      throw new Meteor.Error('USER NOT FOUND');
    }

    const complete = user.hasFunding && user.hasDriverLicense && user.emails[user.emails.length - 1].verified;

    if (!['none', '!none', 'suspended'].includes(user.category)) {
      throw new Meteor.Error('CUSTOMER IS NOT DEACTIVATED');
    }

    if (user.status?.upgradeRequested === true) {
      throw new Meteor.Error('WE ARE PROCESSING YOUR UPGRADE REQUEST');
    }

    if (!complete) {
      throw new Meteor.Error('COMPLETE YOUR PROFILE TO REQUEST REACTIVATION');
    }

    if (user.status?.reactivationRequested === true) {
      throw new Meteor.Error('REACTIVATION ALREADY REQUESTED');
    }

    if (user?.currentCashAdvance?.status === 'active') {
      throw new Meteor.Error('YOU HAVE ACTIVE CASHADVANCE');
    }

    if (user?.disabled === true) {
      throw new Meteor.Error(' ACCOUNT IS PENDING TO DELETE');
    }

    if (user?.suspendedTill) {
      throw new Meteor.Error(' ACCOUNT IS SUSPENDED');
    }

    insertLog(user._id, 'REACTIVATION REQUESTED');

    if (user?.business?.industry !== 'Business' && (await automaticReactivation(user))) {
      return true;
    }

    Meteor.users.update(query, {
      $unset: { reactivationHold: '' },
      $set: {
        'status.reactivationRequested': true
      }
    });

    await updateInteraction({
      userId: user._id,
      status: 'reactivate',
      by: {
        name: 'system'
      },
      flow: ROLE.REPETITION
    });

    if (
      user.metrics &&
      (!user.metrics.cashAdvances || user.metrics.cashAdvances.count == null || user.metrics.cashAdvances.count <= 0)
    ) {
      await assignAgent({
        userId: user._id,
        category: 'seniorUnderwriter'
      });
    } else {
      await assignAgent({
        userId: user._id,
        category: 'reactivate'
      });
    }

    await insertTimelog({
      userId: user._id,
      event: 'reactivation requested',
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

    await checkIfValidAndRequestAssetReport(user._id);

    if ([STAGE.SALES.STAGE_6, STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10].includes(user?.offStage?.stage)) {

      if (user?.offStage?.stage === STAGE.SALES.STAGE_6) {
        await changeStatus({
          userId: user._id,
          agentId: !userId ? user._id : Meteor.userId(),
          status: STATUS.REACTIVATION
        });

      } else {

        await changeStatus({
          userId: user._id,
          agentId: !userId ? user._id : Meteor.userId(),
          status: STATUS.REACTIVATION_REQUEST
        });

        await changeSubStatus({
          userId: user._id,
          agentId: !userId ? user._id : Meteor.userId(),
          subStatus: SUB_STATUS.WAITING_FOR_UW_REVIEW
        });

      }
    }

  } catch (error) {
    logger.error(`users.requestReactivation [${query._id}] ${error}`);
    Sentry.captureException(error, { extra: query._id });
    throw error;
  }
}

Meteor.methods({ 'users.requestReactivation': requestReactivation });
