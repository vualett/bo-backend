/* eslint-disable no-extra-boolean-cast */
/* eslint-disable no-unneeded-ternary */
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';
import Invitations from '../../collections/invitations';
import updateInteraction from '../users/updateInteraction';
import { capitalizeFirstLetterOfEachWord } from '../../utils/utils';
import { insertInvitationNote } from '../notes';
import isValid from 'date-fns/isValid';
import format from 'date-fns/format';
import Queue, { queueBirthdayScheduler, queueCallbackNotification } from '../../queue/queue';
import { InvitationStatusOptions } from '../invitations/invitationStatusOptions';
import updatePromotersPanelInvitation from '../invitations/updatePromotersPanelInvitation';
import { JOB_NAME } from '../../queue/jobs/birthdaySchedulerUnderageJob';
import { ROLES } from '../../consts/roles';

export default function updateOnboardingInteractionStatus({
  invitationId,
  status,
  callbackDate,
  reevaluationDate,
  note,
  system
}) {
  check(invitationId, String);
  check(status, String);

  // Get the invitation
  const invitation = Invitations.findOne({ _id: invitationId });

  if (!invitation) throw new Meteor.Error('No invitation found');

  if (invitation.userId && status === 'invalid') {
    throw new Meteor.Error('Invitation cannot have status (invalid)!');
  }

  if (status === 'underage' && !reevaluationDate) {
    throw new Meteor.Error('NO REEVALUATION DATE PROVIDED');
  }

  if (invitation.interaction?.status === 'underage' && status !== 'underage') {
    Queue.cancel({
      name: JOB_NAME,
      'data.id': invitationId
    });
  }

  const responsable = system ? null : Meteor.users.findOne({ _id: Meteor.userId() });

  const by = system
    ? null
    : {
      name: capitalizeFirstLetterOfEachWord(responsable.firstName),
      id: responsable._id
    };

  const noteObj = {
    message:
      status === 'callback'
        ? 'callback for ' +
        (isValid(callbackDate) && format(callbackDate, 'eeee do, MMMM y')) +
        (!!note ? ': ' + note : '')
        : status + (!!note ? ': ' + note : ''),
    where: 'invitation',
    invitationId: invitation._id,
    by: system ? { name: 'system' } : by,
    type: 'status'
  };

  Invitations.update(
    { _id: invitation._id },
    {
      $set: {
        interaction: {
          timestamp: new Date(),
          by: system ? { name: 'system' } : by,
          status,
          callbackDate
        },
        note: noteObj,
        ...(status === 'invalid' && invitation.status === 'pending'
          ? {
            status: InvitationStatusOptions.INVALID,
            invalidDate: new Date(),
            invalid: true,
            valid: false
          }
          : !system
            ? {
              valid: status === 'invalid' ? false : true,
              invalid: status === 'invalid' ? true : false
            }
            : {})
      }
    },
    (err, data) => {
      if (err) {
        throw new Meteor.Error(err);
      } else if (data) {
        if (!!invitation.userId) {
          updateInteraction({
            userId: invitation.userId,
            status,
            by: system ? { name: 'system' } : by,
            callbackDate,
            flow: ROLES.ONBOARDING,
            note
          });
        } else {
          if (status === 'callback' && isValid(callbackDate)) {
            queueCallbackNotification({
              name: capitalizeFirstLetterOfEachWord(invitation?.metadata?.name),
              callbackTo: 'prospect',
              uniqueId: invitation?._id,
              by,
              callbackDate
            });
          }
          insertInvitationNote(noteObj);

          if (status === 'underage') {
            queueBirthdayScheduler({
              id: invitationId,
              callbackDate: reevaluationDate,
              note,
              isInvitation: true
            });
          }
        }

        Meteor.defer(() => {
          updatePromotersPanelInvitation({ _id: invitation._id });
        });
      }
    }
  );
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'invitations.updateInteractionStatus'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: function updateOnboardingInteractionStatusMethod(params) {
    Security.checkIfAdmin(this.userId);
    return updateOnboardingInteractionStatus(params);
  }
});
