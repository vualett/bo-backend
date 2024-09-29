import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../utils/security';
import Deals from '../../collections/deals';

function fullName(id) {
  const fields = {
    firstName: 1,
    lastName: 1
  };

  const user = Meteor.users.findOne({ _id: id }, { fields });
  if (!user) return false;

  return `${user.firstName} ${user.lastName}`;
}

function getInfo(id, options = {}) {
  this.unblock();
  check(id, String);
  Security.checkLoggedIn(this.userId);

  if (options.onlyName) return fullName(id);

  const fields = {
    firstName: 1,
    lastName: 1,
    createdAt: 1,
    currentCashAdvance: 1,
    isPromoter: 1
  };

  let cashAdvance = false;

  const user = Meteor.users.findOne({ _id: id }, { fields });
  if (!user) return false;

  if (options.cashAdvance) {
    cashAdvance = Deals.findOne({ _id: user?.currentCashAdvance?.id }, { fields: { amount: 1, payments: 1 } });
  }

  return { user, cashAdvance };
}

Meteor.methods({ 'users.getInfoById': getInfo });
