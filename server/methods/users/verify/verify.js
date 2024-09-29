import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../../utils/security';
import Invitations from '../../../collections/invitations';
import Queue, { queueSendReminderToTakeCashAdvance } from '../../../queue/queue';
import notifyUser from '../../../notifications/notifyUser';
import { NotifyChannel } from '../../../notifications/notifyChannel';
import updateInteraction from '../updateInteraction';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';
import updatePromotersPanelInvitation from '../../invitations/updatePromotersPanelInvitation';
import changeStage from '../changeStage';
import { STAGE, STATUS, SUB_STATUS } from '../../../consts/user';
import { insertTimelog } from '../../timelogs/insertTimelog';
import { getUserMaxCapacityToAdvance } from '../getUserMaxCapacityToAdvance';
import changeStatus from '../changeStatus';
import changeSubStatus from '../changeSubStatus';
import Timelogs from '../../../collections/timelogs';
import { sendDealApprovedEmailAfterReevaluation } from '../../../../server/emails/emails';

async function hasBeenMarkAsUnqualifiedEligibleReevaluation(user) {

  if (user?.offStage?.status === STATUS.UNQUALIFIED_ELIGIBLE_FOR_RE_EVAL) {
    return true;
  }

  const timelogs = await Timelogs.find(
    {
      userId: user._id,
      type: 'account',
      eventType: 'user',
      event: `Status changed to ${STATUS.UNQUALIFIED_ELIGIBLE_FOR_RE_EVAL}`
    }).fetch();

  if (timelogs.length > 0) {
    return true;
  }

  return false;
}

export default async function verifiedUser(userId, category, sendSMS, isSystem) {
  try {
    check(userId, String);

    const user = Meteor.users.findOne({ _id: userId });

    if (!user.IDVComplete) throw new Meteor.Error(403, 'IDV not verified');
    if (!user.dwollaFundingURL) throw new Meteor.Error(403, 'dwollaFundingURL is missing');
    if (!user.dwollaCustomerURL) throw new Meteor.Error(403, 'dwollaCustomerURL is missing');

    const categoryToSet = category || user.category;

    const responsable = !isSystem ? { name: `${Meteor.user().firstName} ${Meteor.user().lastName}`, id: Meteor.user()._id }
      : { name: 'system', id: 'system' };

    if (user?.interaction?.status === 'reevaluation') {
      updateInteraction({
        userId,
        status: 'reevaluated',
        flow: 'validation',
        by: responsable
      });
    }

    const set = {
      'status.verified': true,
      'status.qualify': true,
      'status.unqualifiedReason': '',
      verifiedDate: new Date(),
      category: categoryToSet.toLowerCase()
    };

    const affectedRecords = Meteor.users.update({ _id: userId }, { $set: set });

    if (affectedRecords !== 1) return new Meteor.Error(403, 'Invalid');
    if (!isSystem) {
      Meteor.call('logs.insertVerificationLog', userId, categoryToSet.toLowerCase());
    } else {
      Meteor.call('logs.insertVerificationLog', userId, categoryToSet.toLowerCase(), true);
    }

    if (!user.verifiedDate) {
      const invitation = Invitations.findOne({ userId: user._id });
      if (invitation && invitation.metadata?.type !== 'Business') {
        Invitations.update({ _id: invitation._id }, { $set: { verifiedDate: new Date() } });
      }
      if (invitation && invitation.metadata?.type === 'Business') {
        Invitations.update(
          { _id: invitation._id },
          { $set: { verifiedDate: new Date(), isBusinessInvitationChecked: true } }
        );
        await updatePromotersPanelInvitation({ _id: invitation._id });
      }
    }

    let MCTA = null;
    try {
      MCTA = await getUserMaxCapacityToAdvance({ userId: user._id });
    } catch (e) {
      if (e?.error === 'ASSET_REPORT_NOT_90_DAYS') {
        MCTA = 'not_90_days';
      }
    }

    await insertTimelog({
      userId,
      event: 'account verified',
      type: 'account',
      eventType: 'user',
      metadata: {
        MCTA,
        category: set.category,
        by: !isSystem ? Meteor.userId() : 'System'
      },
      _by: responsable
    });

    Queue.cancel({
      name: 'reevaluateClient',
      'data.userId': userId
    });

    Queue.cancel({
      name: 'removeUnqualifiedAssignment',
      'data.userId': userId
    });

    if (sendSMS) {
      await notifyUser({
        body: `Congratulations ${user.firstName}, your Ualett profile has been successfully validated, go to the app to apply for a cash advance`,
        service: 'accNotification',
        userId: user._id,
        channel: NotifyChannel.PUSH
      });
    }

    if (user?.offStage?.stage === STAGE.UNDERWRITING.STAGE_5) {
      await changeStage({
        userId,
        stage: STAGE.SALES.STAGE_6,
      });

      if (await hasBeenMarkAsUnqualifiedEligibleReevaluation(user)) {
        await changeStatus({
          userId,
          status: STATUS.REEVALUATION_NOTICE,
          agentId: !isSystem ? Meteor.userId() : undefined
        });

        const smsMessage = `Good news, ${user.firstName} ${user.lastName}! After reevaluation, your cash advance request has been approved.`
          + ' Log in to your account to review your offer and take the next steps. Need help? Contact us at (844)-844-2488.';
        await notifyUser({
          userId: user._id,
          body: smsMessage,
          service: 'accNotification',
          channel: NotifyChannel.SMS
        });

        await sendDealApprovedEmailAfterReevaluation(user);
      }
      else {
        await changeStatus({
          userId,
          status: STATUS.APPROVED,
          agentId: !isSystem ? Meteor.userId() : undefined
        });
      }

    } else if (user?.offStage?.stage === STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10) {
      await changeStatus({
        userId,
        status: STATUS.WAITING_FOR_CLIENT_REQUEST,
        agentId: !isSystem ? Meteor.userId() : undefined
      });

      await changeSubStatus({
        userId,
        subStatus: SUB_STATUS.ACTION_NEEDED,
        agentId: !isSystem ? Meteor.userId() : undefined
      });
    }

    if (!user.currentCashAdvance) {
      await queueSendReminderToTakeCashAdvance(userId);
    }

    return true;
  } catch (error) {
    logger.error(`users.verify [${userId}] ${error}`);
    Sentry.captureException(error, { extra: Meteor.userId() });
    return false;
  }
}

export async function preVerifyUser(userId, category) {
  check(userId, String);

  const user = Meteor.users.findOne({ _id: userId });

  if (!user.documents.driverLicense.verified) throw new Meteor.Error(403, 'Unverified Driver License');
  if (!user.dwollaFundingURL) throw new Meteor.Error(403, 'dwollaFundingURL is missing');
  if (!user.dwollaCustomerURL) throw new Meteor.Error(403, 'dwollaCustomerURL is missing');

  const preCategoryToSet = category || user.category;

  const set = {
    'status.preVerified': true,
    'status.unqualifiedReason': '',
    preVerifiedDate: new Date(),
    preVerifiedCategory: preCategoryToSet.toLowerCase()
  };

  const affectedRecords = Meteor.users.update({ _id: userId }, { $set: set });

  if (affectedRecords !== 1) return new Meteor.Error(403, 'Invalid');

  Meteor.call('timelogs.insert', {
    userId,
    event: 'account preVerified',
    type: 'account',
    eventType: 'user',
    metadata: {
      category: set.category,
      by: Meteor.userId()
    }
  });

  return true;
}

Meteor.methods({
  'users.verify': function FunctionverifiedUser(userId, category, sendSMS) {
    Security.checkRole(Meteor.userId(), ['super-admin', 'admin', 'validation', 'riskProfile']);
    verifiedUser(userId, category, sendSMS);
  },
  'users.preVerify': function FunctionpreVerifyUser(userId, category) {
    Security.checkRole(Meteor.userId(), ['super-admin', 'admin', 'control', 'riskProfile']);
    preVerifyUser(userId, category);
  }
});
