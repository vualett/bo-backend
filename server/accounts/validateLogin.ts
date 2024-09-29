import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Settings } from '../collections/settings';
import { sendNotification } from '../bot/sendNotification';

interface Parameters {
  user?: Meteor.User;
  allowed?: boolean;
  connection: {
    clientAddress: string;
  };
}

function validateAdminUser(attempt: Parameters): void {
  const settings = Settings.findOne({ _id: 'IpWhitelist' });
  const ipWhiteList: string[] = Array.isArray(settings?.IPAdresses) ? (settings?.IPAdresses as string[]) : [];

  if (
    attempt.user?.isAdmin === true &&
    !ipWhiteList.includes(attempt?.connection?.clientAddress) &&
    attempt.user?.roles?.access?.includes('allowRemoteConnection') === false &&
    !Meteor.isDevelopment
  ) {
    void sendNotification(
      `Security Alert:Unauthorized IP Address [${attempt.user?.firstName} ${attempt.user?.lastName}] from [${attempt?.connection?.clientAddress}]`
    );
    throw new Meteor.Error(403, 'Unauthorized location.');
  }
  const set = {
    'status.online': true,
    'status.lastLogin.date': new Date()
  };

  Meteor.users.update({ _id: attempt.user?._id }, { $set: set });
}

function validateRegularUser(attempt: Parameters): void {
  if (attempt.user?.disabled === true && attempt.allowed === true) {
    if (attempt.user.deleteRequest !== undefined) {
      throw new Meteor.Error(403, 'Your account is pending for deletions.');
    }
    throw new Meteor.Error(403, 'Your account is disabled.');
  }
  const set = {
    'status.lastLogin.date': new Date()
  };

  Meteor.users.update({ _id: attempt.user?._id }, { $set: set });
}

Accounts.validateLoginAttempt((attemptObj: Parameters) => {
  if (attemptObj.user?.isAdmin === true) {
    validateAdminUser(attemptObj);
  } else {
    validateRegularUser(attemptObj);
  }

  return true;
});
