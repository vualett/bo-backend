import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { parsePhoneNumber } from 'libphonenumber-js';
import Security from '../../utils/security';
import updateInteraction from './updateInteraction';
import { queueReevaluateClient, queueRemoveUnqualifiedAssignment } from '../../queue/queue';
import notifyUser from '../../notifications/notifyUser';
import { NotifyChannel } from '../../notifications/notifyChannel';
import { SUPPORT_NUMBER } from '../../keys';
import Invitations from '../../collections/invitations';
import updatePromotersPanelInvitation from '../invitations/updatePromotersPanelInvitation';
import { insertVerificationLog } from '../logs/insertVerificationLog';
import { insertTimelog } from '../timelogs/insertTimelog';
import { STAGE, STATUS, SUB_STATUS } from '../../consts/user';
import * as Sentry from '@sentry/node';
import logger from '../../logger/log';
import changeStatus from './changeStatus';
import changeSubStatus from './changeSubStatus';
import { updateDocuments } from './set/setConfigMethods';

const phoneNumber = parsePhoneNumber(SUPPORT_NUMBER || '+16465134224');
const formattedPhoneNumber = phoneNumber.formatNational();

const updateStatusAndDocuments = async (userId, status, reason) => {
  await changeStatus({ userId, status, agentId: Meteor.userId() });
  await changeSubStatus({ userId, subStatus: reason, agentId: Meteor.userId() });

  // enables the requirements for the user and the argyle sync
  // these two statements go together
  await Meteor.users.updateAsync(
    { _id: userId },
    { $set: { 'requirements.$[elem].enable': true, canSyncArgyle: true } }, // check this out
    { arrayFilters: [{ 'elem.type': 'document', 'elem.enable': { $exists: true } }] },
  );
  await updateDocuments(userId, 'Argyle', 'enable', true);
  //
};

export default async function declineUser(props) {
  const {
    userId,
    status,
    reason,
    note,
    reevaluationDate,
    duplicatedAccountId,
    isSystem
  } = props;

  check(userId, String);
  check(status, String);

  try {
    if (
      status === STATUS.UNQUALIFIED_ELIGIBLE_FOR_RE_EVAL &&
      !reevaluationDate
    ) {
      throw new Meteor.Error('NO_REEVALUATION_DATE_PROVIDED');
    }

    if (reason === SUB_STATUS.DUPLICATE_ACCOUNT && !duplicatedAccountId) {
      throw new Meteor.Error('NO_DUPLICATED_ACCOUNT_ID');
    }

    const user = Meteor.users.findOne({ _id: userId });

    if (reason === SUB_STATUS.SUSPENDED && !user.metrics?.cashAdvances?.count) {
      throw new Meteor.Error('CANNOT_SUSPEND_USER_WITHOUT_CASH_ADVANCE');
    }

    const invitation = Invitations.findOne({ userId: user._id });

    if (invitation && invitation.metadata.type === 'Business') {
      Invitations.update({ _id: invitation._id }, { $set: { isBusinessInvitationChecked: true } });
      await updatePromotersPanelInvitation({ _id: invitation._id });
    }

    if (user?.offStage?.stage === STAGE.UNDERWRITING.STAGE_5 && status === STATUS.NEED_MORE_INFO) {
      await updateStatusAndDocuments(userId, status, reason);
      return true;
    }

    if (user?.offStage?.stage === STAGE.UNDERWRITING.STAGE_5 && status === STATUS.INFO_SUBMITTED && reason === SUB_STATUS.WRONG_INFO) {
      // changes the status to wrong info and then to need more info
      await changeSubStatus({ userId, subStatus: reason, agentId: Meteor.userId() });

      await updateStatusAndDocuments(userId, STATUS.NEED_MORE_INFO, undefined);
      return true;
    }

    if (status === STATUS.NOT_INTERESTED) {
      await changeStatus({ userId, status, agentId: !isSystem ? Meteor.userId() : undefined });

      return true;
    }

    const set = {
      'status.verified': false,
      'status.preVerified': false,
      'status.qualify': false,
      'status.unqualifiedReason': reason,
      'status.declinedBy': !isSystem ? Meteor.userId() : 'system',
      category: 'none',
      previousCategory: user?.category
    };

    const responsable = !isSystem
      ? { id: Meteor.user()._id, name: `${Meteor.user().firstName} ${Meteor.user().lastName}` }
      : { id: 'system', name: 'system' };

    const affectedRecords = Meteor.users.update({ _id: userId }, { $set: set });

    if (affectedRecords !== 1) return new Meteor.Error(403, 'INVALID');

    if (!isSystem) {
      insertVerificationLog(userId, false, false);
    } else {
      insertVerificationLog(userId, false, true);
    }

    await insertTimelog({
      userId,
      event: 'account declined',
      type: 'account',
      eventType: 'user',
      metadata: {
        by: !isSystem ? Meteor.userId() : 'system',
        reason
      },
      _by: responsable
    });

    await notifyUser({
      body: `The added information does not meet the underwriting criteria, please call Ualett at: ${formattedPhoneNumber}` +
        ' or email at: support@ualett.com',
      service: 'customerCare',
      userId: user._id,
      channel: NotifyChannel.PUSH
    });

    await changeStatus({ userId, status, agentId: !isSystem ? Meteor.userId() : undefined });
    await changeSubStatus({ userId, subStatus: reason, agentId: !isSystem ? Meteor.userId() : undefined });

    switch (reason) {
      case SUB_STATUS.RELATED_TO_CLIENT_IN_OVERDUE:
        await updateInteraction({
          userId,
          status: reason,
          flow: 'validation',
          note: `${reason.toUpperCase()} ${note ? ', ' + note : ''}`
        });
        break;
      case SUB_STATUS.DUPLICATE_ACCOUNT:
        await updateInteraction({
          userId,
          status: reason,
          flow: 'validation',
          note: `${reason.toUpperCase()} ${note ? ', ' + note : ''}`,
          duplicatedAccountId
        });
        break;
      case SUB_STATUS.NO_INDEPENDENT_CONTRACTOR_DRIVER:
        await updateInteraction({
          userId,
          status: 'unqualify',
          flow: 'validation',
          note: `${reason.toUpperCase()} ${note ? ', ' + note : ''}`
        });
        await queueRemoveUnqualifiedAssignment({
          userId
        });
        break;

      case SUB_STATUS.SUSPENDED:
        await updateInteraction({
          userId,
          status: reason,
          flow: 'validation',
          note: `${reason.toUpperCase()} ${note ? ', ' + note : ''}`,
          reevaluationDate
        });
        await queueReevaluateClient({
          userId,
          reevaluationDate
        });
        break;
      case SUB_STATUS.NOT_ENOUGH_DAILY_BALANCE:
      case SUB_STATUS.NOT_ENOUGH_DRIVER_INCOME:
      case SUB_STATUS.CURRENTLY_IN_OVERDRAFT:
      case SUB_STATUS.OVERDRAFT_BEHAVIOR:
      case SUB_STATUS.NOT_ENOUGH_INCOMES:
      case SUB_STATUS.NO_LONGER_INDEPENDENT_CONTRACTOR_DRIVER:
      case SUB_STATUS.NEED_MORE_INFO:
        await updateInteraction({
          userId,
          status: 'unqualify',
          flow: 'validation',
          note: `${reason.toUpperCase()} ${note ? ', ' + note : ''}`,
          reevaluationDate
        });
        await queueReevaluateClient({
          userId,
          reevaluationDate
        });
        break;
      case SUB_STATUS.BROKER:
      case SUB_STATUS.DEFAULTED:
      case SUB_STATUS.BANKRUPTCY:
      case SUB_STATUS.HIGH_RISK:
      case SUB_STATUS.SERVICINGS_DEFAULTED:
        await updateInteraction({
          userId,
          status: 'declined',
          flow: 'validation',
          note: `${reason.toUpperCase()} ${note ? ', ' + note : ''}`,
        });
        break;
    }

    return true;

  } catch (error) {
    logger.error(`[users.decline] (${userId}) ${JSON.stringify(error)}`);
    Sentry.captureException(error);
    throw error;
  }
}

Meteor.methods({
  'users.decline': function Functiondecline({ userId, status, reason, note, reevaluationDate, duplicatedAccountId, isSystem }) {
    Security.checkRole(Meteor.userId(), ['super-admin', 'admin', 'control', 'manager']);
    return declineUser({ userId, status, reason, note, reevaluationDate, duplicatedAccountId, isSystem });
  }
});
