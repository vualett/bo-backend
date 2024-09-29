import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import user from './fixtures/user';
import Security from '../../../server/utils/security';
import { updateDocuments } from '../../../server/methods/users/set/setConfigMethods';
import { getIDVMatchCalculation } from '../../../server/api/webhooks/plaid/getIDVMatchCalculation';
import logger from '../../../server/logger/log';
import shouldClearStatus from '../../../server/utils/shouldClearStatus';
import changeStage from '../../../server/methods/users/changeStage';
import { STAGE, STATUS } from '../../../server/consts/user';
import changeStatus from '../../../server/methods/users/changeStatus';
import { markInvitationCompleted } from '../../../server/methods/invitations/invitation';
import createInvitation from '../../../server/methods/invitations/createInvitation';
import { Random } from 'meteor/random';

async function addUser() {
  Security.checkIfAdmin(Meteor.userId());

  const createdUser = user();

  await createInvitation({
    by: Meteor.userId(),
    phone: createdUser.phone,
    metadata: {
      name: `${createdUser.firstName} ${createdUser.lastName}`,
      source: Random.choice(['support', 'store', 'friend', 'chat', 'other']),
      language: Random.choice(['english', 'spanish', 'others']),
      bestTimeCall: Random.choice(['morning', 'afternoon', 'night']),
      typeOfReferral: Random.choice(['taxi', 'truck']),
      arriveFor: Random.choice(['true', 'false']),
      business: createdUser.business.industry,
    },
    referral: {
      firstName: Meteor.user().firstName,
      lastName: Meteor.user().lastName,
      _id: Meteor.userId(),
    }
  });

  Meteor.call('users.create', createdUser);
}

async function addIDV(userID) {
  Security.checkIfAdmin(Meteor.userId());
  Security.checkRole(Meteor.userId(), 'super-admin');
  check(userID, String);

  try {
    const userInfo = await Meteor.users.findOneAsync({ _id: userID });

    if (!userInfo) throw new Meteor.Error(404, 'USER NOT FOUND!');

    const IDVPayloadData = {
      DOB: '1999-01-01',
      address: {
        city: userInfo.address.city,
        country: 'US',
        postal_code: '11223',
        region: userInfo.address.state,
        street: userInfo.address.street1,
        street2: null
      },
      phone_number: userInfo.phone.number,
      name: {
        family_name: 'Doe',
        given_name: userInfo.firstName
      }
    };

    const successData = {
      id: 'idv_9A8B765C4D3E21F',
      status: 'success',
      steps: {
        accept_tos: 'skipped',
        documentary_verification: 'success',
        kyc_check: 'success',
        risk_check: 'success',
        selfie_check: 'success',
        verify_sms: 'not_applicable',
        watchlist_screening: 'success'
      },
      data: IDVPayloadData,
      updatedAt: new Date()
    };

    const failedData = {
      id: 'idv_9A8B765C4D3E21F',
      status: 'failed',
      steps: {
        accept_tos: 'skipped',
        documentary_verification: 'success',
        kyc_check: 'success',
        risk_check: 'success',
        selfie_check: 'failed',
        verify_sms: 'not_applicable',
        watchlist_screening: 'success'
      },
      data: {},
      updatedAt: new Date()
    };

    const IDVStatus = true; // true for success or false for failed

    const set = {
      'identityVerification.status': IDVStatus ? successData.status : failedData.status,
      'identityVerification.id': IDVStatus ? successData.id : failedData.id,
      'identityVerification.steps': IDVStatus ? successData.steps : failedData.steps,
      'identityVerification.data': IDVStatus ? successData.data : failedData.data,
      'identityVerification.updatedAt': IDVStatus ? successData.updatedAt : failedData.updatedAt,
      IDVComplete: IDVStatus,
      hasDriverLicense: IDVStatus
    };

    if (IDVStatus) {
      updateDocuments(userID, 'IDV', 'complete', true);
      updateDocuments(userID, 'Email', 'enable', true);

      if (userInfo?.offStage?.stage === STAGE.ONBOARDING.STAGE_1) {
        await changeStage({
          userId: userID,
          stage: STAGE.ONBOARDING.STAGE_2
        });

        await changeStatus({
          userId: userID,
          status: STATUS.VERIFICATION_IN_PROGRESS
        });
      }

      if (shouldClearStatus(userInfo)) {
        set['status.qualify'] = true;
        set['status.notInterested'] = false;
        set['status.unqualifiedReason'] = '';
      }

      const resultedMatch = getIDVMatchCalculation({
        backoffice: {
          fullName: `${userInfo.firstName} ${userInfo.lastName}`,
          address: `${userInfo.address.street1} ${userInfo.address.city} ${userInfo.address.state} ${userInfo.address.postal_code}`,
          phoneNumber: userInfo.phone.number
        },
        idv: {
          fullName: `${IDVPayloadData.name.given_name} ${IDVPayloadData.name.family_name}`,
          address: `${IDVPayloadData.address.street} ${IDVPayloadData.address.city} ${IDVPayloadData.address.region} ${IDVPayloadData.address.postal_code}`,
          phoneNumber: IDVPayloadData.phone_number
        }
      });

      set.IDVMatch = resultedMatch;

      updateDocuments(userInfo._id, 'IDV', 'complete', true);

      const hasEmailVerified = userInfo.emails?.find((item) => item.verified);
      if (!hasEmailVerified) {
        const _user = await Meteor.users.findOneAsync({
          _id: userInfo._id,
          'offStage.stage': STAGE.ONBOARDING.STAGE_1
        });

        if (_user) {
          await changeStage({
            userId: _user._id,
            stage: STAGE.ONBOARDING.STAGE_2,
          });
          await changeStatus({ userId: _user._id, status: STATUS.VERIFICATION_IN_PROGRESS });
        }

        updateDocuments(userInfo._id, 'Email', 'enable', true);
      } else {
        if (!userInfo.hasFunding) {
          await changeStage({
            userId: userInfo._id,
            stage: STAGE.ONBOARDING.STAGE_3
          });

          updateDocuments(userInfo._id, 'Email', 'complete', true);
          updateDocuments(userInfo._id, 'Bank', 'enable', true);
        } else {
          await changeStage({
            userId: userInfo._id,
            stage: STAGE.UNDERWRITING.STAGE_4
          });

          updateDocuments(userInfo._id, 'Email', 'complete', true);
          updateDocuments(userInfo._id, 'Bank', 'complete', true);
        }
      }
    }

    await Meteor.users.updateAsync({ _id: userID }, { $set: set });

    await markInvitationCompleted({
      userId: userInfo._id,
      validParameter: ['IDVComplete']
    });

  } catch (error) {
    logger.error(`[_dev.users.addIDV] [${userID}] ${error}`);
    throw error;
  }
}

Meteor.methods({
  '_dev.fixtures.addUser': addUser,
  '_dev.users.addIDV': addIDV,
  '_dev.users.delete': function deleteUser(userID) {
    check(userID, String);
    Security.checkIfAdmin(Meteor.userId());
    Security.checkRole(Meteor.userId(), 'super-admin');
    Meteor.users.remove({ _id: userID });
  }
});
