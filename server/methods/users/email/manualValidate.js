import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../../utils/security';
import { isMicrosoftEmail } from '../../../utils/utils';

async function validate(userId, email) {
  check(userId, String);
  check(email, String);

  Security.checkRole(Meteor.userId(), ['admin', 'manager']);

  if (!isMicrosoftEmail(email)) throw new Meteor.Error('NOT_HOTMAIL_EMAIL');

  Meteor.users.update({ _id: userId, 'emails.address': email }, { $set: { 'emails.$.verified': true } });
}

Meteor.methods({ 'users.emailManualValidate': validate });
