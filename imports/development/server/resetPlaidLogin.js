import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import plaidClient from '../../../server/plaid/plaid';


export default async function resetPlaidLogin(userId) {
  check(userId, String);

  const user = await Meteor.users.findOne({ _id: userId });
  if (!user) throw new Meteor.Error('user not found');

  const { plaidAccessToken } = user;
  if (!plaidAccessToken) { throw new Meteor.Error('user does not have access token'); }

  const request = {
    access_token: plaidAccessToken,
  };

  const response = await plaidClient.sandboxItemResetLogin(request);
  await Meteor.users.update({ _id: userId }, { $set: { plaidNeedsUpdate: true } });

  return response;
}

Meteor.methods({ resetPlaidLogin });