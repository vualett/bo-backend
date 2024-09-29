import { Meteor } from 'meteor/meteor';
import './getAssetReport';
import logger from '../logger/log';
import plaidClient from './plaid';
import Security from '../utils/security';
import runIdentityVerificationCheck from './runIdentityVerificationCheck';
import IdentityVerificationToSMS from './IdentityVerificationToSMS';

function providePlaidAuthenticatorCredentials() {
  throw new Meteor.Error('Please update your ualett app.');
}

async function updateItem(data) {
  Security.checkLoggedIn(this.userId);
  logger.info('item updated', data);
  if (!data.public_token) return;

  Meteor.users.update(
    { _id: Meteor.userId() },
    {
      $set: { plaidNeedsUpdate: false }
    }
  );
}

async function getItem(userId) {
  Security.checkLoggedIn(this.userId);
  const user = await Meteor.users.findOne({ _id: userId });
  if (!user) throw new Meteor.Error('user not found');

  const ACCESS_TOKEN = user.plaidAccessToken;
  if (!ACCESS_TOKEN) throw new Meteor.Error('user does not have access token');

  try {
    const request = { access_token: ACCESS_TOKEN };

    const response = await plaidClient.itemGet(request);

    const { item } = response.data;

    return item;
  } catch (error) {
    logger.error(`plaid.getItem [${userId}] ${JSON.stringify(error)}`);
    throw new Meteor.Error('Error at getItem func', error);
  }
}

async function getInstitutions(institutionId) {
  Security.checkIfAdmin(this.userId);

  if (institutionId) {
    return plaidClient
      .institutionsGetById({
        institution_id: institutionId,
        country_codes: ['US']
      })
      .then((res) => res.data.institutions);
  }

  const request = {
    count: 500,
    offset: 0,
    country_codes: ['US']
  };

  const response = await plaidClient.institutionsGet(request);

  const { institutions } = response.data;

  return institutions;
}

async function searchInstitutionsByName(searchQuery) {
  Security.checkIfAdmin(this.userId);

  const request = {
    query: searchQuery,
    products: ['auth', 'assets'],
    country_codes: ['US'],
    options: {
      include_optional_metadata: true
    }
  };

  const response = await plaidClient.institutionsSearch(request);
  const { institutions } = response.data;

  return institutions;
}

async function findInstitutionsByID(institutionID) {
  Security.checkIfAdmin(Meteor.userId());

  const request = {
    institution_id: institutionID,
    country_codes: ['US'],
    options: {
      include_optional_metadata: true,
      include_status: true,
      include_auth_metadata: true
    }
  };

  const response = await plaidClient.institutionsGetById(request);

  const { institution } = response.data;

  return institution;
}

async function getTopInstitutions() {
  Security.checkIfAdmin(this.userId);
  const institutions = [
    { name: 'PNC', id: 'ins_13' },
    { name: 'TD Bank', id: 'ins_14' },
    { name: 'Citi', id: 'ins_5' },
    { name: 'Bank of America', id: 'ins_127989' },
    { name: 'Wells Fargo', id: 'ins_127991' },
    { name: 'Regions Bank', id: 'ins_19' },
    { name: 'SunTrust', id: 'ins_16' }
  ];

  return Promise.all(institutions.map((item) => findInstitutionsByID(item.id)));
}

Meteor.methods({
  'plaid.getAuthenticatorCredentials': providePlaidAuthenticatorCredentials,
  'plaid.updateItem': updateItem,
  'plaid.getItem': getItem,
  'plaid.getInstitutions': getInstitutions,
  'plaid.searchInstitutions': searchInstitutionsByName,
  'plaid.getInstitutionsByID': findInstitutionsByID,
  'plaid.getTopInstitutions': getTopInstitutions,
  'plaid.runIdentityVerificationCheck': runIdentityVerificationCheck,
  'plaid.identityVerificationToSMS': IdentityVerificationToSMS
});
