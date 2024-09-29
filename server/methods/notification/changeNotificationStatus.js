import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';

export default async function changeNotificationStatus({ status }) {
  check(status, Boolean);
  Security.checkLoggedIn(this.userId);
  return await Meteor.users.update({ _id: this.userId }, { $set: { notificationStatus: status } });
}

Meteor.methods({
  'users.changeNotificationStatus': changeNotificationStatus
});
