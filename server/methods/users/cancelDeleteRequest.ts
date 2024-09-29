import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import Security from '../../utils/security';
import * as Sentry from '@sentry/node';

function cancelDeleteRequest(id: string) {
  try {
    Security.checkIfAdmin(this.userId);
    Meteor.users.update(
      { _id: id },
      {
        $set: {
          deleteRequest: false,
          disabled: false
        }
      }
    );
  } catch (error) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`users.cancelDeleteRequest ${message}`);
  }
}

Meteor.methods({ 'users.cancelDeleteRequest': cancelDeleteRequest });
