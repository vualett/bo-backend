import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../../utils/security';

const checkIfEmpty = (fields) => {
  if (Object.entries(fields).length === 0 && fields.constructor === Object) throw new Meteor.Error('OBJECT_EMPTY');
};

function setDriverLicenseMethod(userId, fields) {
  Security.checkRole(this.userId, ['super-admin', 'control', 'technical']);
  check(userId, String);

  checkIfEmpty(fields);

  check(fields, {
    exp: Match.Maybe(String),
    state: Match.Maybe(String),
    id: Match.Maybe(String),
    dob: Match.Maybe(String),
    sex: Match.Maybe(String)
  });

  const set = {};

  if (fields.exp) set['documents.driverLicense.info.exp'] = fields.exp;
  if (fields.dob) set['documents.driverLicense.info.dob'] = fields.dob;
  if (fields.id) set['documents.driverLicense.info.id'] = fields.id.toLowerCase();
  if (fields.sex) set['documents.driverLicense.info.sex'] = fields.sex.toLowerCase();
  if (fields.state) set['documents.driverLicense.info.state'] = fields.state.toLowerCase();

  const update = Meteor.users.update({ _id: userId }, { $set: set });

  if (update) return true;
  return false;
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.set.driverLicense'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: setDriverLicenseMethod
});
