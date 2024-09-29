/* eslint-disable camelcase */
import plaidClient from '../../../plaid/plaid';
import * as Sentry from '@sentry/node';
import { Meteor } from 'meteor/meteor';
import logger from '../../../logger/log';
import { markInvitationCompleted } from '../../../methods/invitations/invitation';
import shouldClearStatus from '../../../utils/shouldClearStatus';
import updateInteraction from '../../../methods/users/updateInteraction';
import { getIDVMatchCalculation } from './getIDVMatchCalculation';
import { setRequirementsIfNotExists, updateDocuments } from '../../../methods/users/set/setConfigMethods';
import changeStage from '../../../methods/users/changeStage';
import { ROLES } from '../../../consts/roles';
import { STAGE, STATUS, SUB_STATUS, PLAID_STATUS } from '../../../consts/user';
import changeStatus from '../../../methods/users/changeStatus';
import changeSubStatus from '../../../methods/users/changeSubStatus';
import { addYears, differenceInYears } from 'date-fns';

function checkIfUnderage(dateOfBirth) {
  return differenceInYears(new Date(), new Date(dateOfBirth)) < 21;
}

function checkIfNoUsaDoc(documents) {
  return documents?.find(
    (doc) => doc?.extracted_data?.issuing_country !== 'US' && doc?.extracted_data?.category === 'drivers_license'
  );
}

async function IDVStatusUpdated(body) {
  const { identity_verification_id } = body;

  const request = {
    identity_verification_id
  };

  try {
    const { status, data } = await plaidClient.identityVerificationGet(request);

    if (status !== 200) return;

    const userInfo = Meteor.users.findOne({ _id: data.client_user_id });

    if (!userInfo) {
      throw new Meteor.Error(404, `USER_NOT_FOUND: ${data.client_user_id}`);
    }

    if (checkIfUnderage(data.user?.date_of_birth)) {
      // CHECK IF UNDERAGE
      await changeStatus({ userId: data.client_user_id, status: STATUS.LOST });
      await changeSubStatus({ userId: data.client_user_id, subStatus: SUB_STATUS.IDV_NOT_ELIGIBLE_UNDERAGE });

      await Meteor.users.updateAsync(
        { _id: data.client_user_id },
        {
          $set: {
            'identityVerification.id': data.id,
            'identityVerification.status': PLAID_STATUS.FAILED,
            'identityVerification.steps': {
              underage: 'failed',
              ...data.steps
            },
            'identityVerification.data': {
              DOB: data.user?.date_of_birth,
              address: data.user?.address,
              name: data.user?.name,
              phone_number: data.user?.phone_number
            },
            'identityVerification.updatedAt': new Date()
          }
        }
      );

      const yearsLeft = 21 - differenceInYears(new Date(), new Date(data.user?.date_of_birth));
      await updateInteraction({
        userId: data.client_user_id,
        status: 'underage',
        reevaluationDate: addYears(new Date(), yearsLeft),
        flow: ROLES.ONBOARDING,
        by: { name: 'system' }
      });

      return true;
    };

    const set = {
      'identityVerification.id': data.id,
      'identityVerification.status': data.status,
      'identityVerification.steps': data.steps,
      'identityVerification.updatedAt': new Date()
    };

    const push = {};
    if (userInfo?.identityVerification?.status !== 'not started') {
      push['identityVerification.history'] = {
        status: userInfo?.identityVerification?.status,
        steps: userInfo?.identityVerification?.steps,
        timestamp: userInfo?.identityVerification?.updatedAt
      };
    }

    setRequirementsIfNotExists(userInfo);

    if (data.status === PLAID_STATUS.PENDING_REVIEW) { // PENDING REVIEW
      await changeStatus({ userId: data.client_user_id, status: STATUS.IDV_PENDING_REVIEW });

    } else if (data.status === PLAID_STATUS.ACTIVE && userInfo?.offStage?.status !== STATUS.IDV_ERROR) { // ACTIVE
      await changeStatus({ userId: data.client_user_id, status: STATUS.IDV_IN_PROGRESS });

    } else if (data.status === PLAID_STATUS.SUCCESS) { // SUCCESS

      set.IDVComplete = true;
      set.hasDriverLicense = true;
      set['identityVerification.data'] = {
        DOB: data.user?.date_of_birth,
        address: data.user?.address,
        name: data.user?.name,
        phone_number: data.user?.phone_number
      };

      const resultedMatch = getIDVMatchCalculation({
        backoffice: {
          fullName: `${userInfo.firstName} ${userInfo.lastName}`,
          address: `${userInfo.address.street1} ${userInfo.address.city} ${userInfo.address.state} ${userInfo.address.postal_code}`,
          phoneNumber: userInfo.phone.number
        },
        idv: {
          fullName: `${data.user?.name?.given_name} ${data.user?.name?.family_name}`,
          address: `${data.user?.address?.street} ${data.user?.address?.city} ${data.user?.address?.region} ${data.user?.address?.postal_code}`,
          phoneNumber: data.user?.phone_number
        }
      });

      set.IDVMatch = resultedMatch;

      updateDocuments(userInfo._id, 'IDV', 'complete', true);

      const hasEmailVerified = userInfo.emails?.find((item) => item.verified);
      if (!hasEmailVerified) {

        if (userInfo?.offStage?.stage === STAGE.ONBOARDING.STAGE_1) {
          await changeStage({
            userId: userInfo._id,
            stage: STAGE.ONBOARDING.STAGE_2
          });

          await changeStatus({
            userId: userInfo._id,
            status: STATUS.VERIFICATION_IN_PROGRESS
          });
        }

        updateDocuments(userInfo._id, 'Email', 'enable', true);
      } else {
        if (!userInfo.hasFunding) {
          await changeStage({
            userId: userInfo._id,
            stage: STAGE.ONBOARDING.STAGE_3
          });

          await changeStatus({
            userId: userInfo._id,
            status: STATUS.EMAIL_NOT_STARTED
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

      try {
        if (shouldClearStatus(userInfo)) {
          set['status.qualify'] = true;
          set['status.notInterested'] = false;
          set['status.unqualifiedReason'] = '';
        }

        await markInvitationCompleted({
          userId: userInfo._id,
          validParameter: ['IDVComplete']
        });
      } catch (error) {
        Sentry.captureException(error);
      }

    } else if (data.status === PLAID_STATUS.FAILED) { // FAILED

      const subStatuses = Object.keys(data.steps).filter((key) => data.steps[key] === PLAID_STATUS.FAILED);

      // CHECK IF NO USA DOC
      if (
        subStatuses.includes(SUB_STATUS.DOCUMENTARY_VERIFICATION) &&
        checkIfNoUsaDoc(data?.documentary_verification?.documents)
      ) {
        set['identityVerification.steps'] = { ...data.steps, no_usa_doc: 'failed' };
        set['identityVerification.documents'] = data?.documentary_verification?.documents;

        await changeStatus({ userId: data.client_user_id, status: STATUS.LOST });
        await changeSubStatus({ userId: data.client_user_id, subStatus: SUB_STATUS.IDV_NOT_ELIGIBLE_NO_USA_DOC });

        Meteor.users.update({ _id: userInfo._id }, { $set: set, $push: push });

        return true;
      }

      if (userInfo?.offStage?.status !== STATUS.IDV_ERROR) {
        // IDV ERROR
        await changeStatus({ userId: data.client_user_id, status: STATUS.IDV_ERROR });
      }

      await changeSubStatus({
        userId: data.client_user_id,
        subStatus: subStatuses.length > 1 ? SUB_STATUS.MULTIPLE_ERRORS : subStatuses[0]
      });
    }

    Meteor.users.update({ _id: userInfo._id }, { $set: set, $push: push });

    return true;
  } catch (error) {
    logger.error(`[IDVStatusUpdated] [${identity_verification_id}] ${JSON.stringify(error)}`);
    throw error;
  }
}

export default IDVStatusUpdated;