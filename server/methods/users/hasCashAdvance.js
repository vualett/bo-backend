import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../utils/security';
import Deals from '../../collections/deals';

Meteor.methods({
  'users.hasCashAdvance': function getInfo(userID) {
    this.unblock();
    check(userID, String);
    Security.checkLoggedIn(this.userId);
    const cashAdvance = Deals.findOne({ userId: userID });
    return cashAdvance;
  }
});
