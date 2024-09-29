import { Meteor } from 'meteor/meteor';

import { Settings } from '../../collections/settings';

Meteor.methods({
  'users.isOpenInvite': function isOpenInvite() {
    return Settings.findOne({ _id: 'appConfig' })?.openInvite;
  }
});
