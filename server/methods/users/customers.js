import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import Security from '../../utils/security';

Meteor.methods({
  customers: function customers(_query, limit) {
    Security.checkIfAdmin(this.userId);
    check(limit, Match.Maybe([Number]));
    check(_query, Object);

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
        roles: true,
        emails: true,
        createdAt: true
      },
      sort: { createdAt: -1 }
    };
    if (limit) options.limit = limit;
    return Meteor.users.find(_query, options).fetch();
  }
});
