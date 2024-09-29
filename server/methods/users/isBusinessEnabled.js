import { Meteor } from 'meteor/meteor';

import { Settings } from '../../collections/settings';

Meteor.methods({
  'users.isBusinessEnabled': function isBusinessEnabled() {
    return Settings.findOne({ _id: 'appConfig' })?.isBusinessEnabled;
  }
});
