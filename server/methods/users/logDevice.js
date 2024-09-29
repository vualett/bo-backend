import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

function logDevice(device, notification) {
  Security.checkLoggedIn(this.userId);
  const found = Meteor.users.findOne({
    _id: Meteor.userId(),
    'devices.uuid': device.uuid
  });

  if (!found) {
    Meteor.users.update({ _id: Meteor.userId() }, { $push: { devices: { ...device, timestamp: new Date() } } });
    return true;
  }

  let set = {
    'devices.$.lastSeen': new Date(),
    'devices.$.appVersion': device.appVersion
  };

  if (notification) set['devices.$.notification'] = notification;

  Meteor.users.update(
    { _id: Meteor.userId(), 'devices.uuid': device.uuid },
    {
      $set: set
    }
  );
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.logDevice',
  func: logDevice
};

DDPRateLimiter.addRule(method, 1, 500);

Meteor.methods({
  [method.name]: method.func
});
