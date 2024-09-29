import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../utils/security';

function addReferrer(userID, referrerID) {
  check(userID, String);
  check(referrerID, String);
  Security.checkIfAdmin(this.userId);

  const referrer = Meteor.users.findOne({ _id: referrerID });
  if (!referrer) throw new Meteor.Error('REFERRER_NOT_FOUND');
  const set = { referrer: referrerID, referrerAddedBy: this.userId };
  Meteor.users.update({ _id: userID }, { $set: set });
}

Meteor.methods({ 'users.addReferrer': addReferrer });
