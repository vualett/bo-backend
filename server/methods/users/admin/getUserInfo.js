import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../../utils/security';
import Deals from '../../../collections/deals';

function getRawInfo(userID) {
  this.unblock();

  check(userID, String);

  Security.checkRole(this.userId, ['super-admin', 'technical']);

  const fields = { services: false, ssn: false };

  const user = Meteor.users.findOne({ _id: userID }, { fields: fields });
  if (!user) return false;

  const cashAdvances = Deals.find({ userId: userID }).fetch();

  return { customer: user, cashAdvances };
}

Meteor.methods({ 'admin.getUserInfo': getRawInfo });
