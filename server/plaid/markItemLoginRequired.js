// MARK ITEM LOGIN REQUIRED
import { Meteor } from 'meteor/meteor';
import insertLog from '../../server/methods/logs/insertGenericLog';
export default function markItemLoginRequired(userID, error) {
  if (error.error_code === 'ITEM_LOGIN_REQUIRED') {
    Meteor.users.update({ _id: userID }, { $set: { plaidNeedsUpdate: true } });
    insertLog(userID, 'NEEDS TO UPDATE BANK ACCOUNT CREDENTIALS');
    return false;
  }
}
