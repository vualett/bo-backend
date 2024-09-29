import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';
import { capitalizeFullName, overallRating } from './transformUtils';

const fields = {
  phone: 1,
  firstName: 1,
  lastName: 1,
  bankAccount: 1,
  plaidNeedsUpdate: 1,
  roles: 1,
  address: 1,
  email: 1,
  emails: 1,
  business: 1,
  canShare: 1,
  category: 1,
  createdAt: 1,
  deal: 1,
  dealsHistory: 1,
  hasDriverLicense: 1,
  has1099Form: 1,
  plaidAssetReport: 1,
  hasFunding: 1,
  invitedBy: 1,
  invited: 1,
  metrics: 1,
  name: 1,
  plaidValidated: 1,
  plaid: 1,
  readyToVerify: 1,
  score: 1,
  rating: 1,
  status: 1,
  type: 1,
  currentCashAdvance: 1,
  demoCashAdvance: 1,
  isPromoter: 1,
  dwollaCustomerURL: 1,
  dwollaFundingURL: 1,
  referrer: 1,
  referrerAddedBy: 1,
  'archive.signupPlatform': 1,
  'documents.driverLicense': 1,
  lastCall: 1,
  paymentISODay: 1,
  deleted: 1,
  pendingDelete: 1,
  controlTags: 1,
  mca: 1,
  language: 1,
  flags: 1,
  interaction: 1,
  assignedAgent: 1,
  promoCode: 1,
  notificationStatus: 1,
  IDVComplete: 1,
  identityVerification: 1,
  categoryType: 1,
  categorySince: 1,
  deleteRequest: 1,
  promoterCode: 1,
  ownerPromoterCode: 1,
  howHeardAboutUs: 1,
  devices: 1,
  reactivationHold: 1,
  canSyncArgyle: 1,
  argyle: 1,
  requirements: 1,
  blockAddBankAccount: 1,
  IDVMatch: 1,
  offStage: 1,
  marketingSource: 1,
  isInBankruptcy: 1,
  promoterDownloadLink: 1,
  previousCategory: 1
};
function user(userId) {
  Security.checkLoggedIn(this.userId);
  const self = this;
  let handler = null;
  let init = true;

  const options = {
    fields: Security.hasRole(Meteor.userId(), ['super-admin', 'technical']) ? { services: false, ssn: false } : fields
  };

  function transform(id, doc) {
    const newDoc = doc;

    function readyToVerify() {
      return doc.hasFunding && doc.hasDriverLicense;
    }

    newDoc.name = capitalizeFullName(doc);

    newDoc.email = doc.emails && doc.emails[doc.emails.length - 1].address;
    newDoc.readyToVerify = readyToVerify();
    newDoc.overallRate = overallRating(doc);

    if (doc.dwollaCustomerURL) {
      newDoc.dwollaCustomerURL = Meteor.isProduction
        ? doc.dwollaCustomerURL.replace('api.', 'dashboard.')
        : doc.dwollaCustomerURL.replace('api-sandbox.', 'dashboard-sandbox.');
    }

    if (doc.dwollaFundingURL) {
      newDoc.dwollaFundingURL = Meteor.isProduction
        ? doc.dwollaFundingURL.replace('api.', 'dashboard.')
        : doc.dwollaFundingURL.replace('api-sandbox.', 'dashboard-sandbox.');
    }

    return newDoc;
  }

  handler = Meteor.users.find({ _id: userId }, options).observeChanges({
    added(id, doc) {
      const transformed = transform(id, doc);
      self.added('users', id, transformed);
    },
    changed(id, _fields) {
      if (init) return;
      self.changed('users', id, _fields);
    },
    removed(id) {
      self.removed('users', id);
    }
  });

  self.ready();
  init = false;
  self.onStop(() => {
    if (handler) handler.stop();
  });
}

Meteor.publish({
  user
});
