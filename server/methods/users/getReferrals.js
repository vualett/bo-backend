import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../utils/security';

function getReferrals(userId) {
  check(userId, String);
  Security.checkLoggedIn(this.userId);

  function transform(doc) {
    const newDoc = doc;
    function status() {
      if (!doc.status) return '';
      if (!doc.status.qualify) return 'unqualified';
      if (!doc.status.verified && doc.hasFunding && doc.hasDriverLicense) return 'readyToVerify';
      if (!doc.status.verified) return 'unverified';

      return 'verified';
    }
    newDoc.statusIs = status();
    return newDoc;
  }

  const options = {
    sort: { createdAt: -1 },
    fields: {
      _id: 1,
      firstName: 1,
      lastName: 1,
      status: 1,
      hasFunding: 1,
      hasDriverLicense: 1,
      currentCashAdvance: 1,
      metrics: 1,
      invited: 1
    },
    transform
  };

  const referrals = Meteor.users.find({ invitedBy: userId }, options).fetch();

  return referrals;
}

Meteor.methods({ 'users.getReferrals': getReferrals });
