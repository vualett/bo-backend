import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  Meteor.disconnect();
});
