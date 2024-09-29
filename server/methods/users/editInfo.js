import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { get } from 'lodash';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { Roles } from 'meteor/alanning:roles';
import Security from '../../utils/security';
import { updateDocumentsByIndustry } from './set/setConfigMethods';

function checkIfAllString(x) {
  return x.every((i) => typeof i === 'string');
}

function edit(userId, fields) {
  Security.checkRole(this.userId, ['super-admin', 'control', 'technical', 'admin', 'manager', 'riskProfile']);
  check(userId, String);

  if (Object.entries(fields).length === 0 && fields.constructor === Object) {
    throw new Meteor.Error('FIELDS_OBJECT_EMPTY');
  }

  check(fields, {
    firstName: Match.Maybe(String),
    lastName: Match.Maybe(String),
    businessName: Match.Maybe(String),

    doingBusinessAs: Match.Maybe(String),
    entityType: Match.Maybe(String),
    stateOfIncorporation: Match.Maybe(String),
    physicalAddress: Match.Maybe(String),
    mailingAddress: Match.Maybe(String),
    federalTaxpayerId: Match.Maybe(String),
    businessEmail: Match.Maybe(String),
    businessPhone: Match.Maybe(String),

    industry: Match.Maybe(String),
    state: Match.Maybe(String),
    city: Match.Maybe(String),
    street1: Match.Maybe(String),
    street2: Match.Maybe(String),
    postalCode: Match.Maybe(String),
    roles: Match.Maybe(Array),
    capAmount: Match.Maybe(Number)
  });

  const set = {};
  const originalValues = {};

  const user = Meteor.users.findOne({ _id: userId });
  if (!user) throw new Meteor.Error('USER_NOT_FOUND');

  if (
    Security.hasExplicitRole(this.userId, ['super-admin', 'technical', 'riskProfile']) ||
    Security.hasAllRoles(this.userId, ['admin', 'financial', 'manager'])
  ) {
    if (fields.firstName) set.firstName = fields.firstName.toLowerCase();
    if (fields.lastName) set.lastName = fields.lastName.toLowerCase();
  }

  set['business.business_name'] = fields.businessName;
  if (fields.industry) set['business.industry'] = fields.industry;
  if (fields.state) set['address.state'] = fields.state.toUpperCase();
  if (fields.city) set['address.city'] = fields.city;
  if (fields.street1) set['address.street1'] = fields.street1;
  if (fields.street2) set['address.street2'] = fields.street2;
  if (fields.postalCode) set['address.postal_code'] = fields.postalCode;
  if (fields.capAmount) set.capAmount = fields.capAmount;

  if (fields?.industry?.toLowerCase() === 'business') {
    if (fields.doingBusinessAs) set['business.doingBusinessAs'] = fields.doingBusinessAs;
    if (fields.entityType) set['business.entityType'] = fields.entityType;
    if (fields.stateOfIncorporation) set['business.stateOfIncorporation'] = fields.stateOfIncorporation;
    if (fields.physicalAddress) set['business.physicalAddress'] = fields.physicalAddress;
    if (fields.mailingAddress) set['business.mailingAddress'] = fields.mailingAddress;
    if (fields.federalTaxpayerId) set['business.federalTaxpayerId'] = fields.federalTaxpayerId;
    if (fields.businessEmail) set['business.email'] = fields.businessEmail;
    if (fields.businessPhone) set['business.phone'] = fields.businessPhone;
  }

  if (fields.roles && checkIfAllString(fields.roles)) Roles.addUsersToRoles(userId, fields.roles);

  Object.entries(set).forEach(([key]) => {
    originalValues[key.replace('.', '_')] = get(user, key);
  });

  if (user.business?.industry !== fields.industry) updateDocumentsByIndustry(userId, fields.industry, this.userId);

  Meteor.users.update(
    { _id: userId },
    {
      $set: set,
      $push: {
        changes: {
          by: this.userId,
          timestamp: new Date(),
          before: originalValues
        }
      }
    }
  );
}

function editCapAmount(userId, capAmount) {
  Security.checkRole(this.userId, ['admin', 'riskProfile', 'technical']);
  check(userId, String);
  check(capAmount, Number);

  const set = {};
  const originalValues = {};

  const user = Meteor.users.findOne({ _id: userId });
  if (!user) throw new Meteor.Error('USER_NOT_FOUND');

  set.capAmount = capAmount;

  Object.entries(set).forEach(([key]) => {
    originalValues[key.replace('.', '_')] = get(user, key);
  });

  Meteor.users.update(
    { _id: userId },
    {
      $set: set,
      $push: {
        changes: {
          by: this.userId,
          timestamp: new Date(),
          before: originalValues
        }
      }
    }
  );
}

function clearCapAmount(userId) {
  Security.checkRole(this.userId, ['admin', 'riskProfile', 'technical']);
  check(userId, String);
  Meteor.users.update({ _id: userId }, { $unset: { capAmount: '' } });
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.editInfo'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: edit,
  'users.editCapAmount': editCapAmount,
  'users.clearCapAmount': clearCapAmount
});
