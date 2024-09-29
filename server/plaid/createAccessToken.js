import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import plaidClient from './plaid';

export default async function createAccessTokenAndUpdateUser(publicToken, userId) {
  check(userId, String);

  const response = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });

  const accessToken = response.data.access_token;
  const itemId = response.data.item_id;

  Meteor.users.update(
    { _id: userId },
    {
      $set: {
        plaidAccessToken: accessToken,
        plaidItemId: itemId,
        plaidValidated: true
      }
    }
  );
  return accessToken;
}
