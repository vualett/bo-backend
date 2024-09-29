/* eslint-disable no-control-regex */
import { check } from 'meteor/check';
import Security from '../../utils/security';
import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import invitations from '../../collections/invitations';
import { ROLES } from '../../consts/roles';

interface Parameters {
  invitationId: string;
  newName: string;
}

export default async function updateOnboardingInteractionName({
  invitationId,
  newName
}: Parameters): Promise<void> | never {
  check(invitationId, String);
  check(newName, String);

  const cleanedName = newName
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[0-9]/g, '')
    .trim();

  await invitations.updateAsync(
    {
      _id: invitationId
    },
    { $set: { 'metadata.name': cleanedName } }
  );
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'invitations.updateInteractionName'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: async function updateOnboardingInteractionStatusMethod(params: Parameters) {
    Security.checkHasAllRoles(this.userId, ['manager', ROLES.ONBOARDING]);

    return await updateOnboardingInteractionName(params);
  }
});
