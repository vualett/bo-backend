import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';
import Invitations from '../../collections/invitations';
import { capitalizeFirstLetterOfEachWord } from '../../utils/utils';
import { insertInvitationNote } from '../notes';
import isValid from 'date-fns/isValid';
import format from 'date-fns/format';
import { queueCallbackNotification } from '../../queue/queue';
import updatePromotersPanelInvitation from '../invitations/updatePromotersPanelInvitation';
import { InvitationStatusOptions } from '../invitations/invitationStatusOptions';

export default function updateOnboardingInteractionStatusInvitation({ invitationId, status, callbackDate, note, system }) {
  check(invitationId, String);
  check(status, String);

  // Get the invitation
  const invitation = Invitations.findOne({ _id: invitationId });

  if (!invitation) throw new Meteor.Error('No invitation found');

  if (invitation.userId && status === 'invalid') {
    throw new Meteor.Error('Invitation cannot have status (invalid)!');
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
        (note ? ': ' + note : '')
        : status + (note ? ': ' + note : ''),
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
              valid: status !== 'invalid',
              invalid: status === 'invalid'
            }
            : {})
      }
    },
    (err, data) => {
      if (err) {
        throw new Meteor.Error(err);
      } else if (data) {
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
  name: 'invitations.updateInteractionStatusInvi'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: function updateOnboardingInteractionStatusMethod(params) {
    Security.checkIfAdmin(this.userId);
    return updateOnboardingInteractionStatusInvitation(params);
  }
});
