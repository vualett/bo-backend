import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../utils/security';
import assignAgent from '../validation/assignAgent';
async function markAsNotInterested(userId, interested) {
  Security.checkIfAdmin(this.userId);
  check(userId, String);

  const haveActiveDeal = await Meteor.users.findOneAsync({
    _id: userId,
    'currentCashAdvance.status': 'active'
  });

  if (haveActiveDeal) throw new Meteor.Error('Cannot be marked because the user has an active deal');

  const user = Meteor.users.findOne({ _id: userId });
  //
  let set = {
    'status.notInterested': true,
    'status.verified': false,
    'status.preVerified': false,
    'status.unqualifiedReason': 'not interested'
  };

  let event = 'not interested';

  if (interested) {
    set = {
      'status.unqualifiedReason': '',
      'status.notInterested': false
    };

    event = 'interested';
    if (
      user.metrics &&
      (!user.metrics.cashAdvances || user.metrics.cashAdvances.count == null || user.metrics.cashAdvances.count <= 0)
    ) {
      assignAgent({
        userId,
        category: 'seniorUnderwriter'
      });
    } else {
      assignAgent({
        userId,
        category: 'validate'
      });
    }
  }

  Meteor.users.update({ _id: userId }, { $set: set });

  const metadata = {};

  if (user.verifiedDate && user.category !== 'none') metadata.from = 'check';
  if (!user.hasFunding || !user.hasDriverLicense || !(user.emails && user.emails.find((e) => e.verified)))
    metadata.from = 'incomplete';
  if (
    (user.hasFunding || user.hasDriverLicense || (user.emails && user.emails.find((e) => e.verified))) &&
    !user.verifiedDate
  )
    metadata.from = 'complete';

  Meteor.call('timelogs.insert', {
    userId,
    event,
    type: 'account',
    eventType: 'user',
    metadata
  });
}

Meteor.methods({ 'users.markAsNotInterested': markAsNotInterested });
