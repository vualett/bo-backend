import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Logs from '../../collections/logs';
import Security from '../../utils/security';

export function insertVerificationLog(userId, category, isSystem) {
  check(userId, String);
  check(category, Match.OneOf(String, Boolean));

  let log = {};
  if (!isSystem) {
    Security.checkIfAdmin(Meteor.userId());
    log = {
      type: 'verification',
      userId,
      decision: category ? 'approved' : 'declined',
      category,
      who: {
        name: `${Meteor.user().firstName} ${Meteor.user().lastName || ''}`,
        id: Meteor.userId()
      },
      timestamp: new Date()
    };
  } else {
    log = {
      type: 'verification',
      userId,
      decision: category ? 'approved' : 'declined',
      category,
      who: {
        name: 'System',
        id: 'System'
      },
      timestamp: new Date()
    };
  }
  const insert = Logs.insert(log);

  return insert;
}

Meteor.methods({
  'logs.insertVerificationLog': insertVerificationLog
});
