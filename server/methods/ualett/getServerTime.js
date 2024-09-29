import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';

Meteor.methods({
  getServerTime() {
    this.unblock();
    Security.checkIfAdmin(this.userId);
    return new Date().toLocaleTimeString('en-US');
  }
});
