import { Meteor } from 'meteor/meteor';
import { Settings } from '../collections/settings';

Meteor.publish('settings', function () {
  this.unblock();
  return Settings.find();
});

Meteor.publish('dailyGoal', function () {
  this.unblock();
  return Settings.find({ _id: 'dailyGoal' });
});

Meteor.publish(null, function () {
  const userFields = {
    fields: {
      firstName: 1,
      lastName: 1,
      address: 1,
      promoterTermsAccepted: 1,
      isPromoter: 1,
      isSubPromoter: 1,
      promoterType: 1,
      'b24.avatarURL': 1,
      isAdmin: 1,
      createdAt: 1
    }
  };

  if (this.userId) {
    return [Meteor.roles.find({}), Meteor.users.find({ _id: this.userId }, userFields)];
  }
  return this.ready();
});
