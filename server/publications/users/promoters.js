import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import Security from '../../utils/security';

const fields = {
  _id: 1,
  phone: 1,
  firstName: 1,
  lastName: 1,
  status: 1,
  emails: 1,
  isAdmin: 1,
  address: 1,
  currentCashAdvance: 1,
  createdAt: 1,
  bankAccount: 1,
  plaidAssetReport: 1,
  verifiedDate: 1,
  oncall: 1,
  lastCall: 1,
  category: 1,
  automaticApproved: 1,
  business: 1
};

function promoters({ limit = 20, query }) {
  check(limit, Number);
  check(query, Match.OneOf(Object, String));
  Security.checkIfAdmin(this.userId);

  const _query = { $and: [{ type: 'user' }, { isPromoter: true }] };

  _query.$and.push(query);

  const options = {
    sort: _sort,
    skip: limit - 20,
    limit: 20,
    fields
  };

  return Meteor.users.find(_query, options);
}

Meteor.publish({ promoters });
