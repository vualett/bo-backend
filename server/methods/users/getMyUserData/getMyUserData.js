import { Meteor } from 'meteor/meteor';
// import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
// import Security from '../../../utils/security';
import Deals from '../../../collections/deals';

const userFields = {
  _id: true,
  phone: true,
  firstName: true,
  lastName: true,
  canShare: true,
  status: true,
  plaidValidated: true,
  hasDriverLicense: true,
  hasFunding: true,
  has1099Form: true,
  bankAccount: true,
  plaidNeedsUpdate: true,
  roles: true,
  emails: true,
  currentCashAdvance: true,
  business: true,
  upgradeEnabled: true,
  category: true,
  reactivationHold: true,
  suspendedTill: true,
  bonusAvailable: true,
  rescheduleHold: true,
  'devices.uuid': true,
  'devices.token': true,
  'devices.hasPermissions': true,
  requestNotificationTokenUpdate: true,
  documents: true,
  metrics: true,
  notificationStatus: true,
  IDVComplete: true,
  canSyncArgyle: true,
  argyle: true,
  blockAddBankAccount: true,
  requirements: true,
  'address.state': true,
  identityVerification: true
};

// function getMyUserData() {
//   Security.checkLoggedIn(this.userId);

//   const user = Meteor.users.findOne({ _id: this.userId }, { fields: userFields });

//   const shouldSignDisclosure = ['CA'].includes(user.address.state);

//   const currentDeal = Deals.find({
//     userId: this.userId,
//     status: {
//       $in: ['active', 'requested', 'approved', 'suspended', 'closed']
//     }
//   });

//   return { ...user, shouldSignDisclosure, currentDeal };
// }

// const method = {
//   type: 'method',
//   name: 'users.getMyUserData'
// };

// Meteor.methods({ [method.name]: getMyUserData });
// DDPRateLimiter.addRule(method, 3, 1000);

Meteor.publish('myUserData', function myUserData() {
  function transform(doc) {
    const newDoc = doc;
    const shouldSignDisclosure = ['CA', 'NY', 'FL', 'GA', 'KS', 'UT', 'VA', 'CT'].includes(doc.address.state);

    return { ...newDoc, shouldSignDisclosure };
  }
  const self = this;

  const observer = Meteor.users.find({ _id: this.userId }, { fields: userFields }).observe({
    added: function (document) {
      self.added('users', document._id, transform(document));
    },
    changed: function (newDocument, oldDocument) {
      self.changed('users', newDocument._id, transform(newDocument));
    },
    removed: function (oldDocument) {
      self.removed('users', oldDocument._id);
    }
  });

  self.onStop(function () {
    observer.stop();
  });

  self.ready();
});

Meteor.publish('myUserDeal', function myUserDeal() {
  return Deals.find({
    userId: this.userId,
    status: {
      $in: ['active', 'requested', 'approved', 'suspended', 'closed']
    }
  });
});

Meteor.methods({
  getAdminsAndPromoters: function getAdminAndPromoters() {
    return Meteor.users
      .find(
        {
          $or: [{ isAdmin: true }, { isPromoter: { $exists: true } }]
        },
        {
          fields: {
            firstName: 1,
            lastName: 1,
            isPromoter: 1,
            isAdmin: 1
          }
        }
      )
      .fetch();
  }
});
