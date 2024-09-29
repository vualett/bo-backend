import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../../utils/security';
import setPaymentDay from './setPaymentDay';
import Deals from '../../../collections/deals';
import { insertNote } from '../../notes';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';

export function updateCanShare(userId, option) {
  check(option, Boolean);
  check(userId, String);
  Meteor.users.update({ _id: userId }, { $set: { canShare: option } });
}

export function canShare(userId, option) {
  Security.checkIfAdmin(this.userId);

  updateCanShare(userId, option);

  return true;
}

function auditDone(userID) {
  check(userID, String);
  Security.checkIfAdmin(this.userId);

  Meteor.users.update({ _id: userID }, { $set: { needsAudit: false } });

  return true;
}

export function setRequirementsIfNotExists(user) {

  if (user && !user.requirements) {
    const { hasFunding, emails, identityVerification } = user;
    const verifiedEmail = emails.find((email) => email.verified);
    const IDVComplete = identityVerification?.status === 'success';

    const requirements = [
      {
        name: 'IDV',
        enable: true,
        complete: IDVComplete,
        type: 'nonDocument'
      },
      {
        name: 'Bank',
        enable: true,
        complete: !!hasFunding,
        type: 'nonDocument'
      },
      {
        name: 'Email',
        enable: true,
        complete: !!verifiedEmail,
        type: 'nonDocument'
      }
    ];

    const requirementsDoc = [
      'Form 1099',
      'Form 1040',
      'Certificate of organization',
      'Form 1120',
      'tax ID',
      'Argyle'
    ];

    requirementsDoc.forEach((doc) => {
      requirements.push({
        name: doc,
        enable: false,
        complete: false,
        type: 'document'
      });
    });

    Meteor.users.update({ _id: user._id }, { $set: { requirements, IDVComplete } });
  }
  else if (user.requirements) {
    const { requirements, identityVerification } = user;
    const IDVComplete = identityVerification?.status === 'success';

    const existsCompleteField = requirements.find((i) => i.name === 'IDV' && i?.complete !== undefined);

    if (!existsCompleteField) {
      Meteor.users.update(
        { _id: user._id, 'requirements.name': 'IDV' },
        {
          $set: {
            'requirements.$.complete': IDVComplete,
            IDVComplete
          }
        }
      );
    }

  }
}

export function updateDocuments(userId, documentName, fieldName, newValue) {
  check(documentName, String);
  check(userId, String);
  check(fieldName, String);
  check(newValue, Boolean);

  Meteor.users.update(
    { _id: userId },
    {
      $set: {
        [`requirements.$[elem].${fieldName}`]: newValue
      }
    },
    {
      arrayFilters: [{ 'elem.name': documentName, [`elem.${fieldName}`]: { $exists: true } }]
    }
  );
}

export function canSyncArgyle(userId, option) {
  check(option, Boolean);
  check(userId, String);

  try {
    Meteor.users.update({ _id: userId }, { $set: { canSyncArgyle: option } });

    const user = Meteor.users.findOne({ _id: userId });

    if (!user) {
      throw new Meteor.Error(404, 'USER_NOT_FOUND!');
    }

    const isArgyleCompleted = user?.requirements?.find((i) => i.name === 'Argyle' && i.complete);

    if (isArgyleCompleted && user?.category === 'none' && !user?.currentCashAdvance && option) {
      Meteor.users.updateAsync(
        { _id: userId, 'requirements.name': 'Argyle' },
        {
          $set: {
            'requirements.$.complete': false
          }
        }
      );
    }

    updateDocuments(userId, 'Argyle', 'enable', option);
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`ualett.canSyncArgyle ${error}`);
  }
}

export function updateDocumentsByIndustry(userId, industry, user) {
  check(userId, String);
  check(industry, String);

  const documentMappings = {
    business: [
      { name: 'Form 1099', enable: false, complete: false, type: 'document' },
      { name: 'Form 1040', enable: false, complete: false, type: 'document' },
      { name: 'Certificate of organization', enable: true, complete: false, type: 'document' },
      { name: 'Form 1120', enable: true, complete: false, type: 'document' },
      { name: 'tax ID', enable: true, complete: false, type: 'document' },
      { name: 'Argyle', enable: true, complete: false, type: 'nonDocument' }
    ],
    'independent contractor': [
      { name: 'Form 1099', enable: true, complete: false, type: 'document' },
      { name: 'Form 1040', enable: false, complete: false, type: 'document' },
      { name: 'Certificate of organization', enable: false, complete: false, type: 'document' },
      { name: 'Form 1120', enable: false, complete: false, type: 'document' },
      { name: 'tax ID', enable: false, complete: false, type: 'document' },
      { name: 'Argyle', enable: true, complete: false, type: 'nonDocument' }
    ],
    'independent contractor driver': [
      { name: 'Form 1099', enable: false, complete: false, type: 'document' },
      { name: 'Form 1040', enable: false, complete: false, type: 'document' },
      { name: 'Certificate of organization', enable: false, complete: false, type: 'document' },
      { name: 'Form 1120', enable: false, complete: false, type: 'document' },
      { name: 'tax ID', enable: false, complete: false, type: 'document' },
      { name: 'Argyle', enable: true, complete: false, type: 'nonDocument' }
    ]
  };

  try {
    const requirements = documentMappings[industry.toLowerCase()] || [];

    const user = Meteor.users.findOne(userId);
    const existingRequirements = user.requirements || [];

    requirements.forEach((newDoc) => {
      const existingDocIndex = existingRequirements.findIndex((doc) => doc.name === newDoc.name);
      if (existingDocIndex !== -1) {
        existingRequirements[existingDocIndex] = newDoc;
      }
    });
    const note = `LOB: changed to ${industry}`;
    insertNote({
      message: note,
      where: 'user',
      userId,
      by: Meteor.user() !== undefined ? { id: Meteor.user()._id, name: Meteor.user().firstName } : 'system'
    });
    Meteor.users.update({ _id: userId }, { $set: { requirements: existingRequirements } });
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`ualett.getCashFlow ${error}`);
  }
}

Meteor.methods({
  'users.setConfig.updateDocuments': updateDocuments,
  'users.setConfig.canShare': canShare,
  'users.setConfig.canSyncArgyle': function setArgyle(userId, option) {
    Security.checkRole(this.userId, ['validation']);
    canSyncArgyle(userId, option);
  },
  'users.setConfig.auditDone': auditDone,
  'users.setConfig.paymentDay': function setPaymentDayMethod(userId, ISODay) {
    check(userId, String);
    check(ISODay, Number);
    Security.checkIfAdmin(this.userId);
    const activeCA = Deals.findOne({ userId, status: 'active' });
    if (activeCA) return 'ACTIVE_CA';
    return setPaymentDay(userId, ISODay);
  }
});
