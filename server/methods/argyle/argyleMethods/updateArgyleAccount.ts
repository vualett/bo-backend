/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { Meteor } from 'meteor/meteor';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';
import ArgyleApi from '../argyleAPI';

interface Parameters {
  userId: string;
  accountId: string;
}

export default async function updateArgyleAccount({ userId, accountId }: Parameters) {
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
        paystubs: argyleAccount.availability.paystubs,
      }
    };

    const user = Meteor.users.findOne({ 'argyle.id': userId });

    if (user === undefined) {
      throw new Meteor.Error('USER_NOT_FOUND');
    }

    const isAdded = await Meteor.users.updateAsync(
      { 'argyle.accounts.id': accountId },
      {
        $set: {
          'argyle.accounts.$': accountDto
        }
      }
    );

    if (!isAdded) {
      throw new Meteor.Error('ACCOUNT_NOT_UPDATED');
    }
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;
    logger.error(`updateArgyleAccount: ${userId} [${message}]`);
    Sentry.captureException(error, { extra: { userId } });
  }
}
