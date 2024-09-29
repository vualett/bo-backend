import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../../utils/security';
// import Dwolla from "../../../dwolla/dwolla";

export default async function fundingSourceAddBack(UserId) {
  check(UserId, String);
  Security.checkRole(this.userId, ['technical']);

  const user = Meteor.users.findOne({ _id: UserId });

  if (!user.dwollaFundingURL) return false;
  if (user.hasFunding) return false;

  // const result = await Dwolla().get(`${user.dwollaFundingURL}`);
  // if (!result) return false;
  // const { _embedded } = result.body;

  Meteor.call('users.setConfig.updateDocuments', UserId, 'Bank', 'complete', true);
  Meteor.users.update(
    { _id: UserId },
    {
      $set: { plaidValidated: true, hasFunding: true }
    }
  );

  return true;
}

// /METHODS
Meteor.methods({
  'users.fundingSource.addBack': fundingSourceAddBack
});
