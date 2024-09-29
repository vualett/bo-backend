import { Meteor } from 'meteor/meteor';
import Security from '../../../server/utils/security';
import shouldClearStatus from '../../../server/utils/shouldClearStatus';
import { check } from 'meteor/check';
import { updateDocuments, setRequirementsIfNotExists } from '../../../server/methods/users/set/setConfigMethods';
import logger from '../../../server/logger/log';
import changeStage from '../../../server/methods/users/changeStage';
import { STAGE, STATUS } from '../../../server/consts/user';
import changeStatus from '../../../server/methods/users/changeStatus';
import { markInvitationCompleted } from '../../../server/methods/invitations/invitation';

async function verifyEmail(userID) {
  Security.checkIfAdmin(Meteor.userId());
  check(userID, String);

  try {
    const userInfo = await Meteor.users.findOneAsync({ _id: userID });

    if (!userInfo) throw new Meteor.Error(404, 'USER NOT FOUND!');

    setRequirementsIfNotExists(userInfo);

    const set = {
      'emails.0.verified': true
    };

    if (shouldClearStatus(userInfo)) {
      set['status.qualify'] = true;
      set['status.notInterested'] = false;
      set['status.unqualifiedReason'] = '';
    }

    await Meteor.users.updateAsync({ _id: userInfo._id }, { $set: set });

    updateDocuments(userInfo._id, 'Email', 'complete', true);

    if (userInfo.identityVerification?.status === 'success') {
      if (!userInfo.hasFunding) {

        if (userInfo?.offStage?.stage === STAGE.ONBOARDING.STAGE_2) {
          await changeStage({
            userId: userInfo._id,
            stage: STAGE.ONBOARDING.STAGE_3
          });

          await changeStatus({
            userId: userInfo._id,
            status: STATUS.EMAIL_NOT_STARTED
          });
        }

        updateDocuments(userInfo._id, 'IDV', 'complete', true);
        updateDocuments(userInfo._id, 'Bank', 'enable', true);
      } else {
        await changeStage({
          userId: userInfo._id,
          stage: STAGE.UNDERWRITING.STAGE_4
        });

        updateDocuments(userInfo._id, 'IDV', 'complete', true);
        updateDocuments(userInfo._id, 'Bank', 'complete', true);
      }

    } else {
      updateDocuments(userInfo._id, 'IDV', 'enable', true);
    }

    await markInvitationCompleted({ userId: userInfo._id, validParameter: ['hasEmailVerified'] });

  } catch (error) {
    logger.error(`[Verifyemail] [${userID}] ${error}`);
    throw error;
  }
}

Meteor.methods({ '_dev.users.verifyEmail': verifyEmail });
