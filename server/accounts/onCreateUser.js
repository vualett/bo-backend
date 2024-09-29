import { Accounts } from 'meteor/accounts-base';
import { Random } from 'meteor/random';
import { checkIfPhoneNumberExist } from './utils';
import formatNumber from '../utils/formatNumber';
import { checkPromoCode } from '../methods/promo/promoCodes';
import * as Sentry from '@sentry/node';
import logger from '../logger/log';
import { Meteor } from 'meteor/meteor';
import Invitations from '../collections/invitations';
import createInvitation from '../methods/invitations/createInvitation';
import promoCodes from '../collections/promoCodes';

const requirementsList = [
  'IDV',
  'Bank',
  'Email',
  'Form 1099',
  'Form 1040',
  'Certificate of organization',
  'Form 1120',
  'tax ID',
  'Argyle'
];

const defaultRequirements = requirementsList.map((element) => {
  return {
    name: element,
    enable: false,
    complete: false,
    type: ['IDV', 'Bank', 'Email', 'Argyle'].includes(element) ? 'nonDocument' : 'document'
  };
});

const DEFAULT = {
  canShare: false,
  hasFunding: false,
  plaidValidated: false,
  hasDriverLicense: false,
  has1099Form: false,
  plaidNeedsUpdate: false,
  currentCashAdvance: false,
  requirements: defaultRequirements,
  status: {
    verified: false,
    qualify: true,
    notInterested: false
  },
  metrics: { cashAdvances: { count: 0 } },
  plaid: {},
  paymentISODay: false,
  IDVComplete: false,
  identityVerification: { status: 'not started' }
};

export function generateDefaultRequirementsBasedOnBusinessType(businessType) {
  switch (businessType) {
    case 'Independent Contractor':
      return defaultRequirements.map((req) => ({
        ...req,
        enable: ['IDV', 'Bank', 'Email'].includes(req.name)
      }));
    case 'Independent Contractor Driver':
      return defaultRequirements.map((req) => ({
        ...req,
        enable: ['IDV', 'Bank', 'Email'].includes(req.name)
      }));
    case 'Business':
      return defaultRequirements.map((req) => ({
        ...req,
        enable: ['IDV', 'Bank', 'Email', 'Certificate of Organization', 'Form 1120', 'tax ID'].includes(req.name)
      }));
    default:
      return defaultRequirements;
  }
}

function createAdminUser(options, user) {
  const newUser = { ...user, ...DEFAULT };
  newUser._id = Random.id(9);
  newUser.firstName = options.firstName.toLowerCase();
  newUser.lastName = options.lastName.toLowerCase();
  newUser.howHeardAboutUs = options.howHeardAboutUs;
  newUser.isAdmin = true;
  newUser._id = `A-${newUser._id}`;
  newUser.type = 'admin';
  return newUser;
}

Accounts.onCreateUser((options, user) => {
  const newUser = { ...user, ...DEFAULT };
  if (options.isAdmin) return createAdminUser(options, newUser);

  try {
    newUser._id = Random.id(9);
    newUser.firstName = options.firstName.toLowerCase();
    newUser.lastName = options.lastName.toLowerCase();
    newUser.howHeardAboutUs = options.howHeardAboutUs;
    newUser.type = 'user';
    newUser.address = options.address;
    newUser.business = options.business;
    newUser.category = 'none';
    newUser.createdAt = new Date();

    if (options.marketingSource) {
      newUser.marketingSource = { ...options.marketingSource.marketingSource };
    }

    if (options.phone) {
      const _Phone = formatNumber(options.phone);
      checkIfPhoneNumberExist(_Phone);

      newUser.phone = {
        number: _Phone,
        verified: true
      };

      if (options.promoCode) {
        // verify if invitation exists
        const invitations = Invitations.findOne({ 'phone.number': _Phone }, { sort: { when: -1 } });
        if (invitations) {
          // update user marking invitedBy same as invitation
          newUser.invitedBy = invitations.by;
        } else {
          if (checkPromoCode(options.promoCode) === 'promoterCode') {
            newUser.promoterCode = options.promoCode;
            newUser.invitedBy = Meteor.users.findOne({
              ownerPromoterCode: options.promoCode
            })?._id;
          } else {
            newUser.promoCode = options.promoCode;
          }
          createInvitation({
            phone: options.phone,
            by:
              checkPromoCode(options.promoCode) === 'promoterCode'
                ? promoCodes.findOne({ _id: options.promoCode }).promoterId
                : options.promoCode,
            metadata: {
              name: options.firstName,
              source: 'other',
              bestTimeCall: 'morning',
              arriveFor: false,
              business: options?.business?.business_name
            }
          });
        }
      }
    }

    if (options.metadata && options.metadata.device) {
      newUser.devices = [{ ...options.metadata.device, first: true }];
    }

    return newUser;
  } catch (error) {
    if (error.reason !== 'Account already exists with this number') {
      Sentry.captureException(error);
      logger.error(`onCreateUser[${newUser._id}]${error}`);
    }
    throw error;
  }
});
