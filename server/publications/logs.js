import { Meteor } from 'meteor/meteor';
import Logs from '../collections/logs';

Meteor.publish({
  logs(id, limit) {
    return Logs.find({ userId: id }, { limit, sort: { timestamp: -1 } });
  },
  userFilteredLogs({ userId, systemSwitch, verificationSwitch, statusSwitch }, limit) {
    let type = [];
    if (systemSwitch) {
      type.push('generic');
    }
    if (verificationSwitch) {
      type.push('verification');
    }
    if (statusSwitch) {
      type.push('status');
    }

    return Logs.find(
      {
        userId,
        type: { $in: type }
      },
      { limit, sort: { timestamp: -1 } }
    );
  },
  callLogs(id, limit) {
    return Logs.find({ userId: id, type: 'call' }, { limit, sort: { timestamp: -1 } });
  }
});
