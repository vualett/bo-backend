import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../../utils/security';

function getUsersWithRole(role) {
  this.unblock();
  check(role, String);
  Security.checkIfAdmin(this.userId);

  return Meteor.users.find({ isAdmin: true, 'roles.__global_roles__': role }).fetch();
}

Meteor.methods({ 'admin.getUsersWithRole': getUsersWithRole });
