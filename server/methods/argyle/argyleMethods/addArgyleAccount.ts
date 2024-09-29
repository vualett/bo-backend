/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { Meteor } from 'meteor/meteor';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';
import ArgyleApi from '../argyleAPI';
import { updateDocuments } from '../../users/set/setConfigMethods';
import { STATUS, STAGE } from '../../../consts/user';
import changeStatus from '../../users/changeStatus';
import changeSubStatus from '../../users/changeSubStatus';

interface Parameters {
  userId: string;
  accountId: string;
}

export default async function addArgyleAccount({ userId, accountId }: Parameters) {
  try {
    const argyleAccount = await ArgyleApi.getAccount(accountId);

    const accountDto = {
      id: argyleAccount.id,
      employers: argyleAccount.employers,
      source: argyleAccount.source,
      item: argyleAccount.item,
      createdAt: argyleAccount.created_at,
      updatedAt: argyleAccount.updated_at,
      scannedAt: argyleAccount.scanned_at,
      connection: argyleAccount.connection,
      availability: {
        paystubs: argyleAccount.availability.paystubs
      }
    };

    if (!accountDto.employers.length) {
      accountDto.employers = ['connecting...'];
    }

    const user = Meteor.users.findOne({ 'argyle.id': userId });

    if (user === undefined) {
      throw new Meteor.Error('USER_NOT_FOUND');
    }

    const isAdded = await Meteor.users.updateAsync(
      { 'argyle.id': userId },
      {
        $push: {
          'argyle.accounts': accountDto
        }
      }
    );

    if (!isAdded) {
      throw new Meteor.Error('ACCOUNT_NOT_ADDED');
    }

    if (user?.offStage?.stage === STAGE.UNDERWRITING.STAGE_5) {
      // set the document as complete and disable the requirement
      updateDocuments(user._id, 'Argyle', 'complete', true);
      await Meteor.users.updateAsync(
        { _id: user._id },
        { $set: { 'requirements.$[elem].enable': false } },
        { arrayFilters: [{ 'elem.type': 'document', 'elem.complete': false }] }
      );
      //

      await changeStatus({ userId: user._id, status: STATUS.INFO_SUBMITTED, agentId: undefined });
      await changeSubStatus({ userId: user._id, subStatus: undefined, agentId: undefined });
    }
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;
    logger.error(`updateUserToken: ${userId} [${message}]`);
    Sentry.captureException(error, { extra: { userId } });
  }
}
