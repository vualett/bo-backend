import { Meteor } from 'meteor/meteor';
import Security from '../utils/security';
import plaidClient from './plaid';

export default async function getAuth(userId, accessToken) {
  Security.checkLoggedIn(this.userId);
  const user = await Meteor.users.findOne({ _id: userId });

  const _accessToken = accessToken || user.plaidAccessToken;

  const request = { access_token: _accessToken };

  const response = await plaidClient.authGet(request);

  return response.data;
}

Meteor.methods({
  'plaid.getAuth': getAuth
});
