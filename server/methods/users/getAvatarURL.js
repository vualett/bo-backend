import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../utils/security';

Meteor.methods({
  'users.getAvatarURL': function getAvatarURL(userId) {
    Security.checkIfAdmin(this.userId);
    this.unblock();
    return false;
  }
});
