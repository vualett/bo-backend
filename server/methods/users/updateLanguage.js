import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../utils/security';
import { insertDataChangesLog } from '../../dataChangesLogs';

function updateLanguage({ customerID, language }) {
  check(customerID, String);
  Security.checkIfAdmin(this.userId);
  const customer = Meteor.users.findOne({ _id: customerID });

  Meteor.users.update({ _id: customerID }, { $set: { language } });

  insertDataChangesLog({
    where: 'users',
    documentID: customerID,
    operation: 'update',
    method: 'updateLanguage',
    createdBy: this.userId,
    old_data: customer.language,
    new_data: language
  });
}

Meteor.methods({
  'users.updateLanguage': updateLanguage
});
