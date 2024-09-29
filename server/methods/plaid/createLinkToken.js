/* eslint-disable camelcase */
import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import plaidClient from '../../plaid/plaid';
import { Products } from 'plaid';
import Security from '../../utils/security';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import { PLAID_IDV_TEMPLATE_ID, PLAID_WEBHOOK_URL } from '../../keys';

export default async function createLinkToken(platform, idv) {
  this.unblock();
  Security.checkLoggedIn(Meteor.userId());
  try {
    if (!Meteor.userId()) throw new Meteor.Error('MUST PROVIDE USERID');
    const user = Meteor.users.findOne({ _id: Meteor.userId() });
    if (!user) throw new Meteor.Error('USER NO FOUND');
    if (user.blockAddBankAccount) throw new Meteor.Error('BLOCKED_ADD_BANK_ACCOUNT');

    const request = {
      user: {
        client_user_id: user._id,
        email_address: user.emails[0].address
      },
      client_name: 'Ualett',
      products: [Products.Auth, Products.Assets],
      country_codes: ['US'],
      language: 'en',
      webhook: PLAID_WEBHOOK_URL,
      ...(user.plaidNeedsUpdate === true ? { access_token: user.plaidAccessToken } : {}),
      account_filters: {
        depository: {
          account_subtypes: ['checking']
        }
      }
    };

    if (idv) {
      const IDVRequest = {
        client_user_id: user._id,
        template_id: PLAID_IDV_TEMPLATE_ID,
        is_shareable: true,
        gave_consent: true,
        is_idempotent: true,
        user: {
          email_address: user.emails[0].address,
          phone_number: user.phone.number,
          name: {
            given_name: user.firstName.trim(),
            family_name: user.lastName.trim()
          },
          address: {
            street: user.address.street1.trim(),
            city: user.address.city.trim(),
            region: user.address.state.trim(),
            postal_code: user.address.postal_code.trim(),
            country: 'US'
          }
        }
      };

      if (user.address.street2) IDVRequest.user.address.street2 = user.address.street2.trim();

      await plaidClient.identityVerificationCreate(IDVRequest);

      request.products = [Products.IdentityVerification];

      request.identity_verification = {
        template_id: PLAID_IDV_TEMPLATE_ID,
        gave_consent: true
      };
      delete request.account_filters;
    }

    if (platform === 'android') request.android_package_name = 'com.ualett';
    if (platform === 'ios') request.redirect_uri = 'https://static.ualett.com/plaid-oauth.html';

    const linkTokenResponse = await plaidClient.linkTokenCreate(request);

    const { link_token } = linkTokenResponse.data;

    return { link_token };
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`[createLinkToken] [${Meteor.userId()}] ${error}`);
    throw new Meteor.Error('Sorry, try again later.');
  }
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'plaid.createLinkToken',
  clientAddress: () => true
};

DDPRateLimiter.addRule(method, 10, 1000);

Meteor.methods({
  [method.name]: createLinkToken
});
