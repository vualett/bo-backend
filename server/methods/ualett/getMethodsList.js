import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';

Meteor.methods({
  getMethodsList() {
    Security.checkRole(this.userId, 'super-admin');
    return Object.keys(Meteor.server.method_handlers).map((key) => key);
  }
});
