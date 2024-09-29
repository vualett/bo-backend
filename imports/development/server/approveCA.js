import { Meteor } from 'meteor/meteor';
import Security from '../../../server/utils/security';

function approveCA(userID) {
  this.unblock();
  Security.checkIfAdmin(this.userId);

  const user = Meteor.users.findOne({ _id: userID });
  Meteor.call('deals.approve', user.currentCashAdvance.id, true, true);
}

Meteor.methods({ '_dev.users.approveCA': approveCA });
