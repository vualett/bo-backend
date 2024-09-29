import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import Security from '../../utils/security';
import capitalize from '../../utils/capitalize';

function whoVerified(userID, customerID) {
  const user = Meteor.users.findOne({ _id: userID });
  Meteor.call(
    'logs.insert',
    customerID,
    `DL verified by: ${capitalize(user.firstName)} ${user.lastName.toUpperCase().charAt(0)}.`
  );
}

function approveDriverLicense(userID, fields) {
  Security.checkIfAdmin(this.userId);
  check(userID, String);

  const set = {
    'documents.driverLicense.status': 'processed',
    'documents.driverLicense.verified': true,
    hasDriverLicense: true
  };

  if (fields && Security.hasRole(this.userId, ['admin', 'control', 'technical'])) {
    check(fields, {
      exp: Match.Maybe(String),
      state: Match.Maybe(String),
      id: Match.Maybe(String),
      dob: Match.Maybe(String),
      sex: Match.Maybe(String)
    });

    if (fields.exp) set['documents.driverLicense.info.exp'] = fields.exp;
    if (fields.dob) set['documents.driverLicense.info.dob'] = fields.dob;
    if (fields.id) set['documents.driverLicense.info.id'] = fields.id.toUpperCase();
    if (fields.sex) set['documents.driverLicense.info.sex'] = fields.sex.toUpperCase();
    if (fields.state) set['documents.driverLicense.info.state'] = fields.state.toLowerCase();
  }

  whoVerified(this.userId, userID);

  return Meteor.users.update({ _id: userID }, { $set: set });
}

function declineDriverLicense(userID) {
  check(userID, String);
  Security.checkIfAdmin(this.userId);

  const set = {
    hasDriverLicense: false,
    'documents.driverLicense.status': 'processed',
    'documents.driverLicense.verified': false
  };
  return Meteor.users.update({ _id: userID }, { $set: set });
}

function removeDriverLicense(userID) {
  check(userID, String);
  Security.checkRole(this.userId, ['technical', 'super-admin']);

  const set = {
    hasDriverLicense: false,
    'documents.driverLicense': false
  };
  return Meteor.users.update({ _id: userID }, { $set: set });
}

Meteor.methods({
  'users.approveDriverLicense': approveDriverLicense,
  'users.declineDriverLicense': declineDriverLicense,
  'users.removeDriverLicense': removeDriverLicense
});
