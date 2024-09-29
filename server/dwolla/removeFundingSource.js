import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../utils/security';
import Dwolla from './dwolla';
import { sendFundingSourceRemoved } from '../emails/emails';
import reactivatedDwollaAccount from '../methods/users/reactivatedDwollaAccount';
import insertLog from '../methods/logs/insertGenericLog';
import { insertNote } from '../methods/notes';
import { updateDocuments } from '../methods/users/set/setConfigMethods';
import { STAGE, STATUS } from '../consts/user';
import changeStatus from '../methods/users/changeStatus';
import * as Sentry from '@sentry/node';
import logger from '../logger/log';

export default async function removeFundingSource(UserId, FundingURL, local, isReactivated = true, by) {
  check(UserId, String);

  try {

    const user = Meteor.users.findOne({ _id: UserId });

    if (!user) {
      throw new Meteor.Error(404, 'USER NOT FOUND!');
    }

    const updateOptions = {
      $unset: {
        previousCategory: true
      },
      $push: {
        'archive.plaid': {
          accessToken: user.plaidAccessToken,
          ItemId: user.plaidItemId,
          archivedAt: new Date()
        },
        'archive.bankAccounts': { ...user.bankAccount, archivedAt: new Date() }
      },
      $set: { plaidValidated: false, hasFunding: false, category: 'none' }
    };
    if (!local && Security.hasRole(this.userId, ['super-admin'])) {
      const userFundingURL = FundingURL || user.dwollaFundingURL;
      await Dwolla()
        .post(`${userFundingURL}`, { removed: true })
        .then((res) => res.headers.get('location'));

      updateOptions.$unset = { dwollaFundingURL: true, bankAccount: true };

      sendFundingSourceRemoved(user, user.bankAccount);
    }
    if (isReactivated) {
      reactivatedDwollaAccount(user._id);
    }

    Meteor.users.update({ _id: user._id }, updateOptions);

    updateDocuments(user._id, 'Bank', 'complete', false);

    const note = `Bank Removed - ${user.bankAccount.bankName} ending ${user.bankAccount.mask}`;

    if (!by) {
      insertLog(UserId, note);
    } else {
      insertNote({
        message: note,
        where: 'user',
        userId: UserId,
        by: by ? { id: Meteor.user()._id, name: Meteor.user().firstName } : 'system'
      });
    }

    if ([STAGE.UNDERWRITING.STAGE_9, STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10].includes(user?.offStage?.stage)) {
      await changeStatus({
        userId: user._id,
        agentId: by || undefined,
        status: STATUS.DWOLLA_UNLINKS
      });
    }

  } catch (error) {
    logger.error(`removeFundingSource: [${UserId}] ${error}`);
    Sentry.captureException(error);
    throw error;
  }

}
