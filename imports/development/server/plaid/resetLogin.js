import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import plaidClient from '../../../../server/plaid/plaid';
import Security from '../../../../server/utils/security';

Meteor.methods({
  'plaid.resetLogin': async function resetLogin(userId) {
    check(userId, String);
    Security.checkRole(this.userId, 'super-admin');

    const user = await Meteor.users.findOne({ _id: userId });
    if (!user) throw new Meteor.Error('user not found');

    const { plaidAccessToken } = user;

    const request = {
      access_token: plaidAccessToken
    };

    await plaidClient.sandboxItemResetLogin(request);
  }
});
