/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Meteor } from 'meteor/meteor';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';
import { STATUS, STAGE } from '../../../consts/user';
import changeStatus from '../../users/changeStatus';

interface Parameters {
  userId: string;
  id: string;
}

export default async function removeArgyleAccount({ userId, id }: Parameters) {
  try {
    const user = Meteor.users.findOne({ 'argyle.id': userId });

    if (!user) {
      throw new Meteor.Error('USER_NOT_FOUND');
    }

    await Meteor.users.updateAsync(
      { 'argyle.id': userId },
      {
        $pull: {
          'argyle.accounts': { id }
        }
      }
    );

    if (user?.offStage?.stage === STAGE.UNDERWRITING.STAGE_5 && user?.argyle?.accounts?.length <= 1) {
      // set the document as not complete and enable the requirement
      await Meteor.users.updateAsync(
        { _id: user._id, 'requirements.name': 'Argyle' },
        { $set: { 'requirements.$.enable': true, 'requirements.$.complete': false, canSyncArgyle: true } }
      );
      await Meteor.users.updateAsync(
        { _id: user._id },
        { $set: { 'requirements.$[elem].enable': true } },
        { arrayFilters: [{ 'elem.type': 'document', 'elem.complete': false }] }
      );
      //
      await changeStatus({ userId: user._id, status: STATUS.NEED_MORE_INFO, agentId: undefined });
    }
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;
    logger.error(`updateUserToken: ${userId} [${message}]`);
    Sentry.captureException(error, { extra: { userId } });
  }
}
