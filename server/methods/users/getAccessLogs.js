import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import AccessLogs from '../../collections/accessLogs';
import Security from '../../utils/security';

Meteor.methods({
  'users.getAccessLogs': function getAccessLogs(userId) {
    Security.checkIfAdmin(this.userId);
    check(userId, String);

    const accessLogs = AccessLogs.find({ userID: userId }, { limit: 10, sort: { timestamp: -1 } }).fetch();
    return accessLogs;
  }
});
