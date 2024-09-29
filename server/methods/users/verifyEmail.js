import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { markInvitationCompleted } from '../invitations/invitation';
import shouldClearStatus from '../../utils/shouldClearStatus';
import updateAccount from '../../dwolla/updateAccount';
import { setRequirementsIfNotExists, updateDocuments } from './set/setConfigMethods';
import changeStage from './changeStage';
import { STAGE, STATUS } from '../../consts/user';
import changeStatus from './changeSubStatus';

async function verifyEmail(token) {
  check(token, String);

  const user = Meteor.users.findOne({
    'services.email.verificationTokens.token': token
  });

  if (!user) throw new Meteor.Error(403, 'Verify email link expired');

  const tokenRecord = user.services.email.verificationTokens.find((t) => t.token === token);
  if (!tokenRecord) {
    return {
      userId: user._id,
      error: new Meteor.Error(403, 'Verify email link expired')
    };
  }

  const emailsRecord = user.emails.find((e) => e.address === tokenRecord.address);
  if (!emailsRecord) {
    return {
      userId: user._id,
      error: new Meteor.Error(403, 'Verify email link is for unknown address')
    };
  }

  setRequirementsIfNotExists(user);

  const set = {
    emails: [
      {
        address: tokenRecord.address,
        verified: true
      },
      ...user.emails.filter((item) => item.address !== tokenRecord.address && item.verified)
    ]
  };

  if (shouldClearStatus(user)) {
    set['status.qualify'] = true;
    set['status.notInterested'] = false;
    set['status.unqualifiedReason'] = '';
  }

  Meteor.users.update(
    {
      _id: user._id,
      'emails.address': tokenRecord.address
    },
    {
      $set: set,
      $pull: {
        'services.email.verificationTokens': { address: tokenRecord.address }
      }
    }
  );

  Meteor.defer(async () => {
    const infoUserId = Meteor.users.findOne({ _id: user._id });
    if (infoUserId.dwollaCustomerURL) {
      const userObj = {
        firstName: infoUserId.firstName,
        lastName: infoUserId.lastName,
        email: tokenRecord.address,
        ipAddress: this.connection.clientAddress
      };
      await updateAccount(infoUserId.dwollaCustomerURL.split('/').pop(), userObj);
    }
  });

  updateDocuments(user._id, 'Email', 'complete', true);

  if (user.identityVerification?.status === 'success') {
    if (!user.hasFunding) {

      if (user?.offStage?.stage === STAGE.ONBOARDING.STAGE_2) {
        await changeStage({
          userId: user._id,
          stage: STAGE.ONBOARDING.STAGE_3
        });

        await changeStatus({
          userId: user._id,
          status: STATUS.EMAIL_NOT_STARTED
        });
      }

      updateDocuments(user._id, 'IDV', 'complete', true);
      updateDocuments(user._id, 'Bank', 'enable', true);
    } else {
      await changeStage({
        userId: user._id,
        stage: STAGE.UNDERWRITING.STAGE_4
      });

      updateDocuments(user._id, 'IDV', 'complete', true);
      updateDocuments(user._id, 'Bank', 'complete', true);
    }

  } else {
    updateDocuments(user._id, 'IDV', 'enable', true);
  }

  // mark the invitation as completed if so
  await markInvitationCompleted({ userId: user._id, validParameter: ['hasEmailVerified'] });

  return true;
}

// DEFINING METHOD

const method = {
  type: 'method',
  name: 'users.verifyEmail',
  clientAddress: () => true
};

DDPRateLimiter.addRule(method, 1, 3000);

Meteor.methods({ [method.name]: verifyEmail });
