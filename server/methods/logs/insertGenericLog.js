import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import differenceInMilliseconds from 'date-fns/differenceInMilliseconds';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Logs from '../../collections/logs';
import Security from '../../utils/security';

export default function insertLog(userId, message, who, type) {
  const log = {
    type: type || 'generic',
    userId,
    who: {
      name: 'Ualett',
      id: who || 'ualett'
    },
    message,
    timestamp: new Date()
  };

  const insert = Logs.insert(log);

  return insert;
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'logs.insert'
};

DDPRateLimiter.addRule(method, 1, 3000);

Meteor.methods({
  [method.name]: function insertLogMethod(userId, message) {
    check(userId, String);
    check(message, String);
    Security.checkIfAdmin(this.userId);
    const lastLog = Logs.findOne({ userId, 'who.id': Meteor.userId() });

    if (lastLog && differenceInMilliseconds(new Date(), lastLog.timestamp) < 5000) return false;
    return insertLog(userId, message, Meteor.userId());
  }
});
