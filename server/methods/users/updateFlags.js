import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../utils/security';
import { insertDataChangesLog } from '../../dataChangesLogs';

function updateFlags({ customerID, flags }) {
  check(customerID, String);
  Security.checkRole(this.userId, ['overdue', 'technical']);
  const customer = Meteor.users.findOne({ _id: customerID });

  Meteor.users.update({ _id: customerID }, { $set: { flags } });

  insertDataChangesLog({
    where: 'users',
    documentID: customerID,
    operation: 'update',
    method: 'updateFlags',
    createdBy: this.userId,
    old_data: customer.flags,
    new_data: flags
  });
}

Meteor.methods({
  'users.updateFlags': updateFlags
});
