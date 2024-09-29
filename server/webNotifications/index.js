import webpush from 'web-push';
import { Meteor } from 'meteor/meteor';
import Security from '../utils/security';
import { WEBNOTIFICATIONS_PRIVATE_KEY, WEBNOTIFICATIONS_PUBLIC_KEY } from '../keys';

export default () => {
  webpush.setVapidDetails('mailto:erasmo@ualett.com', WEBNOTIFICATIONS_PUBLIC_KEY, WEBNOTIFICATIONS_PRIVATE_KEY);
};

export function sendWebNotification(userId, notification) {
  const user = Meteor.users.findOne({ _id: userId });
  if (user?.webNotificationSubscription) {
    const payload = JSON.stringify(notification);
    webpush.sendNotification(user?.webNotificationSubscription, payload).catch((err) => console.log(err));
  }
}

Meteor.methods({
  'users.webNotificationsSubscribe': function (subscription) {
    Security.checkIfAdmin(this.userId);
    Meteor.users.update({ _id: this.userId }, { $set: { webNotificationSubscription: JSON.parse(subscription) } });
  },
  'users.sendWebPushNotification': function (userId, notification) {
    Security.checkIfAdmin(this.userId);
    return sendWebNotification(userId, notification);
  }
});
