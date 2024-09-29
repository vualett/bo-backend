import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Logs from '../../collections/logs';
import Notes from '../../collections/notes';
import Security from '../../utils/security';

function getLogsLimit({ userId, personalSwitch, statusSwitch, systemSwitch, verificationSwitch }) {
  check(userId, String);
  Security.checkIfAdmin(this.userId);
  let type = [];
  let ntype = [];
  let logsType = [];
  if (systemSwitch) {
    logsType.push('generic');
  }
  if (verificationSwitch) {
    logsType.push('verification');
  }
  if (statusSwitch) {
    type.push('status');
  } else {
    ntype.push('status');
  }

  const logsCount = Logs.find({
    userId,
    type: { $in: logsType }
  }).count();

  const notesCount = Notes.find({
    userId,
    where: 'user',
    ...(!personalSwitch ? { type: { $in: type } } : { type: { $nin: ntype } })
  }).count();

  return { logsCount, notesCount };
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'logs.getLogsLimit'
};

// DDPRateLimiter.addRule(method, 1, 3000);

Meteor.methods({
  [method.name]: getLogsLimit
});
