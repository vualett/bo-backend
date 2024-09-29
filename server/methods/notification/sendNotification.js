import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';
import { NotifyChannel } from '../../notifications/notifyChannel';
import notifyUser from '/server/notifications/notifyUser';

export default async function sendNotification({ body, service, userId }) {
  check(body, String);
  check(service, String);
  check(userId, String);
  Security.checkIfAdmin(Meteor.userId());
  return await notifyUser({ body, service, userId, channel: NotifyChannel.SMS });
}

Meteor.methods({
  'users.sendNotification': sendNotification
});
