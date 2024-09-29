import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';
import Deals from '../../collections/deals';

function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function isAdmin(userId) {
  const user = Meteor.users.findOne({ _id: userId });
  if (user && user.isAdmin) return true;
  return false;
}

Meteor.publish({
  users(userId) {
    Security.checkLoggedIn(this.userId);
    const self = this;
    let handler = null;
    const query = {};
    const options = {
      fields: {
        _id: true,
        phone: true,
        firstName: true,
        lastName: true,
        canShare: true,
        status: true,
        plaidValidated: true,
        hasDriverLicense: true,
        hasFunding: true,
        bankAccount: true,
        plaidNeedsUpdate: true,
        roles: true
      },
      sort: { createdAt: -1 }
    };

    let init = true;

    if (userId) query._id = userId;

    if (isAdmin(this.userId)) {
      options.fields.address = true;
      options.fields.archive = true;
      options.fields.email = true;
      options.fields.emails = true;
      options.fields.business = true;
      options.fields.canShare = true;
      options.fields.category = true;
      options.fields.createdAt = true;
      options.fields.deal = true;
      options.fields.dealsHistory = true;
      options.fields.hasDriverLicense = true;
      options.fields.hasFunding = true;
      options.fields.invitedBy = true;
      options.fields.invited = true;
      options.fields.lastName = true;
      options.fields.metrics = true;
      options.fields.name = true;
      options.fields.phone = true;
      options.fields.plaidNeedsUpdate = true;
      options.fields.plaidValidated = true;
      options.fields.readyToVerify = true;
      options.fields.score = true;
      options.fields.status = true;
      options.fields.type = true;
      options.fields.referrer = true;
      options.fields.needsAudit = true;
      options.fields.responsiblePerson = true;

      if (Security.hasExplicitRole(this.userId, ['portfolio'])) {
        query.responsiblePerson = this.userId;
      }
    } else {
      query._id = this.userId;
    }

    function transform(id, doc) {
      const newDoc = doc;
      const _deal = Deals.findOne({ userId: id });

      function score() {
        return 0;
      }

      function readyToVerify() {
        return doc.hasFunding && doc.hasDriverLicense;
      }

      newDoc.name = `${capitalizeFirstLetter(doc.firstName)} ${capitalizeFirstLetter(doc.lastName)}`;

      newDoc.score = score();
      newDoc.deal = _deal || false;
      newDoc.email = doc.emails && doc.emails[doc.emails.length - 1].address;
      newDoc.readyToVerify = readyToVerify();

      return newDoc;
    }

    handler = Meteor.users.find(query, options).observeChanges({
      added(id, doc) {
        const transformed = transform(id, doc);
        self.added('users', id, transformed);
      },
      changed(id, fields) {
        if (init) return;
        self.changed('users', id, fields);
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
});

Meteor.publish({
  userData() {
    return Meteor.users.find(
      { _id: this.userId },
      {
        fields: {
          firstName: 1,
          lastName: 1,
          address: 1,
          promoterTermsAccepted: 1,
          isPromoter: 1,
          isSubPromoter: 1,
          promoterType: 1,
          isAdmin: 1,
          createdAt: 1
        }
      }
    );
  }
});

function adminUsers() {
  if (!isAdmin(this.userId)) return false;
  return Meteor.users.find({ isAdmin: { $eq: true } });
}

Meteor.publish({
  adminUsers,
  myReferrals() {
    Security.checkLoggedIn(this.userId);

    return Meteor.users.find(
      { invitedBy: this.userId },
      {
        fields: {
          phone: true,
          firstName: true,
          lastName: true,
          roles: true
        }
      }
    );
  }
});
