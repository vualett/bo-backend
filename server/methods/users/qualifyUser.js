import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

export function unqualifyUser({ userId }) {
  check(userId, String);

  const set = {
    'status.qualify': false,
    'status.unqualifiedReason': 'does not meet the requirements'
  };

  const affectedRecords = Meteor.users.update({ _id: userId }, { $set: set });

  if (affectedRecords !== 1) throw new Meteor.Error(403, 'Invalid');
}

export function requalifyUser({ userId }) {
  check(userId, String);

  const set = {
    'status.qualify': true,
    'status.unqualifiedReason': ''
  };

  const affectedRecords = Meteor.users.update({ _id: userId }, { $set: set });

  if (affectedRecords !== 1) throw new Meteor.Error(403, 'Invalid');

  return true;
}
