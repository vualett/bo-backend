import { Meteor } from 'meteor/meteor';
import Security from '/server/utils/security';

async function getCurrentAppVersion() {
  let message = '2.1';

  return message;
}

Meteor.methods({
  'users.getCurrentAppVersion': getCurrentAppVersion
});
