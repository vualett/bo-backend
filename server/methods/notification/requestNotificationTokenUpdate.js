import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';

function requestNotificationTokenUpdate(userId) {
  check(userId, String);
  Security.checkLoggedIn(this.userId);
  return Meteor.users.update({ _id: userId }, { $set: { requestNotificationTokenUpdate: true } });
}

function cancelNotificationTokenUpdate() {
  Security.checkLoggedIn(this.userId);
  return Meteor.users.update({ _id: this.userId }, { $unset: { requestNotificationTokenUpdate: '' } });
}

Meteor.methods({
  'users.requestNotificationTokenUpdate': requestNotificationTokenUpdate,
  'users.cancelNotificationTokenUpdate': cancelNotificationTokenUpdate
});
