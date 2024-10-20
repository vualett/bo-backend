/* eslint-disable no-extra-boolean-cast */
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { parsePhoneNumber } from 'libphonenumber-js';
import Invitations from '../../collections/invitations';
import Security from '../../utils/security';
import createInvitation from './createInvitation';
import logger from '../../logger/log';
import Notes from '../../collections/notes';
import Logs from '../../collections/logs';
import updateOnboardingInteractionStatus from '../push/updateInteractionStatus';
import { capitalizeFirstLetterOfEachWord, isUnderaged } from '../../utils/utils';
import updatePromotersPanelInvitation from './updatePromotersPanelInvitation';
import { validatePhoneNumber } from '../users/sendPhoneVerificationCode';
import { InvitationStatusOptions } from './invitationStatusOptions';
import assignAgent from '../validation/assignAgent';
import changeStage from '../users/changeStage';
import { STAGE, STATUS } from '../../consts/user';
import { updateDocuments } from '../users/set/setConfigMethods';
import changeStatus from '../users/changeStatus';
import { ROLES } from '../../consts/roles';
import customerStatus from '../users/dwolla/checkUserStatus';
import createAssetReport from '../../../server/methods/users/plaid/createAssetReport';

export async function checkInvitationAndMarkIt(userId) {
  check(userId, String);

  const user = Meteor.users.findOne({ _id: userId });
  if (!user) throw new Meteor.Error('user not found');

  const invitation = Invitations.findOne({ 'phone.number': user.phone.number }, { sort: { when: -1 } });

  if (invitation) {
    Invitations.update(
      { _id: invitation._id },
      {
        $set: {
          used: true,
          userId: user._id,
          valid: true,
          status: InvitationStatusOptions.ACCOUNT_CREATED
        }
      }
    );

    updateOnboardingInteractionStatus({
      invitationId: invitation._id,
      status: 'account created',
      system: true
    });

    updateDocuments(userId, 'IDV', 'enable', true);
    if (user.business.industry === 'Business') {
      assignAgent(user._id, invitation._id);
    }

    // If agent mark friend invitation, the credit is for the friend not the agent
    let invitedBy;
    if (invitation?.metadata?.source === 'friend' && invitation?.metadata?.friendId) {
      invitedBy = invitation.metadata.friendId;
    } else {
      invitedBy = invitation.by;
    }

    // Change invitation notes to usernotes
    Notes.update(
      { invitationId: invitation._id },
      {
        $set: {
          userId,
          where: 'user'
        }
      },
      { multi: true }
    );

    // Change invitation logs to user logs
    Logs.update(
      { invitationId: invitation._id },
      {
        $set: {
          userId
        }
      },
      { multi: true }
    );

    Meteor.users.update(
      { _id: userId },
      {
        $set: {
          invitedBy,
          invited: invitation.when,
          interaction: invitation.interaction,
          language: invitation.metadata.language === 'español' ? 'es' : 'en'
        },
        ...(!!invitation.assignedAgent
          ? {
            $addToSet: {
              assignedAgent: invitation.assignedAgent
            }
          }
          : {})
      }
    );

    Meteor.call('timelogs.insert', {
      userId,
      event: 'account created',
      type: 'account',
      eventType: 'user',
      ...(!!invitation.assignedAgent
        ? {
          _by: {
            name: capitalizeFirstLetterOfEachWord(
              `${invitation.assignedAgent?.agent?.firstName} ${invitation.assignedAgent?.agent?.lastName}`
            ),
            id: invitation.assignedAgent?.agent?.id
          }
        }
        : {})
    });
  }

  await changeStage({
    userId: user._id,
    stage: STAGE.ONBOARDING.STAGE_1
  });

  await changeStatus({
    userId: user._id,
    status: STATUS.IDV_NOT_STARTED
  });

}

// Verifies if the other 2 parameters are meet and updates invitation
export async function markInvitationCompleted({ userId, validParameter }) {
  check(userId, String);
  check(validParameter, Array);

  const user = Meteor.users.findOne({ _id: userId });

  const emailVerified = validParameter.includes('hasEmailVerified') || !!user.emails.filter((e) => e.verified).length;
  const hasDriverLicense = validParameter.includes('hasDriverLicense') || !!user.hasDriverLicense;
  const hasFunding = validParameter.includes('hasFunding') || !!user.hasFunding;
  const IDVComplete = validParameter.includes('IDVComplete') || !!user.IDVComplete;
  if (emailVerified && hasFunding && !user.verifiedDate && (IDVComplete || hasDriverLicense)) {
    await Invitations.update(
      { userId: user._id },
      {
        $set: {
          completedDate: new Date(),
          status: InvitationStatusOptions.ACCOUNT_COMPLETED
        }
      }
    );

    const onboardingAssignedAgent = user?.assignedAgent?.find((item) => item.category === ROLES.ONBOARDING);

    Meteor.defer(async () => {
      const invitation = Invitations.findOne({ 'phone.number': user.phone.number }, { sort: { when: -1 } });
      await updatePromotersPanelInvitation({ _id: invitation._id });
    });

    Meteor.call('timelogs.insert', {
      userId: user._id,
      event: 'account completed',
      type: 'account',
      eventType: 'user',
      ...(!!onboardingAssignedAgent
        ? {
          _by: {
            name: capitalizeFirstLetterOfEachWord(
              `${onboardingAssignedAgent?.agent?.firstName} ${onboardingAssignedAgent?.agent?.lastName}`
            ),
            id: onboardingAssignedAgent?.agent?.id
          }
        }
        : {})
    });

    if (
      user?.business?.industry !== 'Business' &&
      (await customerStatus(user.dwollaCustomerURL, user._id)) !== 'suspended' &&
      isUnderaged(user) !== true
    ) {
      Meteor.users.update({ _id: user._id }, { $set: { automaticFlowVerify: true } });
      await createAssetReport(user._id);

      if (user?.offStage?.stage === STAGE.UNDERWRITING.STAGE_4) {
        await changeStage({
          userId: user._id,
          stage: STAGE.UNDERWRITING.STAGE_5
        });
      }
    } else {
      Meteor.users.update({ _id: user._id }, { $set: { automaticFlowVerify: false } });
      await assignAgent({
        userId: user._id,
        category: 'seniorUnderwriter'
      });
    }
  }
}

async function verifyInvitation({ phone }) {
  check(phone, String);
  if (!validatePhoneNumber({ phone })) throw new Meteor.Error('Invalid phone number');

  const phoneNumber = parsePhoneNumber(phone, 'US');

  const { number } = phoneNumber;

  const invitations = await Invitations.findOne({ 'phone.number': number }, { sort: { when: -1 } });

  if (!invitations || invitations.invalid) {
    throw new Meteor.Error(`${number} is not invited`);
  }

  const updated = await Invitations.update({ 'phone.number': number }, { $set: { used: true } });

  Meteor.defer(() => {
    updatePromotersPanelInvitation({ _id: invitations._id });
  });

  if (!updated) throw new Meteor.Error('error');
  return true;
}

async function addNote(id, note) {
  Security.checkIfAdmin(this.userId);
  const noteObj = {
    message: note,
    author: {
      name: Meteor.user().firstName,
      id: Meteor.userId()
    },
    createdAt: new Date()
  };

  await Invitations.update({ _id: id }, { $push: { notes: noteObj } });
}

async function markAsNotInterested(id) {
  Security.checkIfAdmin(this.userId);
  await Invitations.update({ _id: id }, { $set: { notInterested: true, notInterestedDate: new Date() } });
}

async function markAsInvalid(id, valid = false) {
  Security.checkIfAdmin(this.userId);
  await Invitations.update({ _id: id }, { $set: { invalid: !valid, invalidDate: new Date() } });
}

async function changeTypeOfReferral(id, type = 'taxi') {
  Security.checkIfAdmin(this.userId);
  await Invitations.update({ _id: id }, { $set: { 'metadata.typeOfReferral': type } });
}

function findInvitation(phone) {
  Security.checkIfAdmin(this.userId);
  try {
    const phoneNumber = parsePhoneNumber(phone, 'US');
    const { number } = phoneNumber;
    const invitations = Invitations.findOne({ 'phone.number': number }, { sort: { when: -1 } });
    if (invitations) return invitations;
    return false;
  } catch (error) {
    logger.error(`Error finding invitation: ${error}`);
    return false;
  }
}

function invitationExist(phone) {
  try {
    const phoneNumber = parsePhoneNumber(phone, 'US');
    const { number } = phoneNumber;
    const invitations = Invitations.findOne({ 'phone.number': number }, { sort: { when: -1 } });
    if (invitations) return true;
    return false;
  } catch (error) {
    logger.error(`Error finding invitation: ${error}`);
    return false;
  }
}

const invitations = {
  checkInvitationAndMarkIt,
  createInvitation,
  markInvitationCompleted
};

export default invitations;

Meteor.methods({
  'invitations.check': verifyInvitation,
  'invitations.addNote': addNote,
  'invitations.markAsNotInterested': markAsNotInterested,
  'invitations.markAsInvalid': markAsInvalid,
  'invitations.changeTypeOfReferral': changeTypeOfReferral,
  'invitations.findInvitation': findInvitation,
  'invitations.checkInvitations': invitationExist,

  verifyInvitation
});
