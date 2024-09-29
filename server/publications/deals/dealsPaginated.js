/* eslint-disable dot-notation */
import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';
import Deals from '../../collections/deals';
import { ROLES } from '../../consts/roles';

function isAdmin(userId) {
  const user = Meteor.users.findOne({ _id: userId });
  if (user && user.isAdmin) return true;
  return false;
}

export default function dealsPaginated({ query, sort, limit, skip }) {
  Security.checkLoggedIn(this.userId);
  if (!isAdmin(this.userId)) throw new Meteor.Error('error');

  const _case = Security.hasExplicitRole(this.userId, 'repetition')
    ? Security.hasExplicitRole(this.userId, 'manager')
      ? 'repetitionLead'
      : 'repetition'
    : Security.hasExplicitRole(this.userId, ROLES.ONBOARDING) && Security.hasExplicitRole(this.userId, ROLES.SALES)
    ? Security.hasExplicitRole(this.userId, 'manager')
      ? null
      : Security.hasExplicitRole(this.userId, ROLES.ONBOARDING)
      ? Security.hasExplicitRole(this.userId, 'manager')
        ? 'onboardingLead'
        : ROLES.ONBOARDING
      : Security.hasExplicitRole(this.userId, ROLES.SALES)
      ? Security.hasExplicitRole(this.userId, 'manager')
        ? 'salesLead'
        : ROLES.SALES
      : null
    : null;

  const self = this;
  let handler = null;
  let init = true;

  const _query = {};

  if (query) {
    if (query.status) {
      _query.status = query.status;
    } else {
      _query.status = {
        $not: {
          $in: ['suspended', 'cancelled']
        }
      };
    }
    if (query.createdAt) _query.createdAt = query.createdAt;
  } else {
    _query.status = {
      $not: {
        $in: ['suspended', 'cancelled']
      }
    };
  }

  if (_case === 'repetition') {
    _query['assignedAgent'] = {
      $elemMatch: {
        category: 'repetition',
        'agent.id': this.userId
      }
    };
    _query['firstDeal'] = { $exists: false };
  } else if (_case === 'repetitionLead') {
    _query['assignedAgent'] = {
      $elemMatch: {
        category: 'repetition'
      }
    };
    _query['firstDeal'] = { $exists: false };
  } else if (_case === ROLES.ONBOARDING) {
    _query['assignedAgent'] = {
      $elemMatch: {
        category: ROLES.ONBOARDING,
        'agent.id': this.userId
      }
    };
    _query['firstDeal'] = { $exists: true };
  } else if (_case === 'onboardingLead') {
    _query['assignedAgent'] = {
      $elemMatch: {
        category: ROLES.ONBOARDING
      }
    };
    _query['firstDeal'] = { $exists: true };
  } else if (_case === ROLES.SALES) {
    _query['assignedAgent'] = {
      $elemMatch: {
        category: ROLES.SALES,
        'agent.id': this.userId
      }
    };
    _query['firstDeal'] = { $exists: true };
  } else if (_case === 'salesLead') {
    _query['assignedAgent'] = {
      $elemMatch: {
        category: ROLES.SALES
      }
    };
    _query['firstDeal'] = { $exists: true };
  }

  const options = {
    ...(skip ? { skip } : {}),
    ...(sort ? { sort } : {}),
    ...(limit ? { limit } : { limit: 20 })
  };

  function _transform(id, doc) {
    const newDoc = doc;

    function paid() {
      const payments = doc.payments.filter((p) => p.status === 'paid');
      const total = payments.map((p) => p.amount).reduce((a, b) => a + b, 0);

      return {
        count: payments.length,
        total
      };
    }

    newDoc.owner = Meteor.users.findOne({ _id: doc.userId }, { fields: { firstName: 1, lastName: 1 } }) || {};
    newDoc.paid = paid();
    return newDoc;
  }

  handler = Deals.find(_query, options).observeChanges({
    added(id, doc) {
      const transformed = _transform(id, doc);
      self.added('deals', id, transformed);
    },
    changed(id, fields) {
      if (init) return;
      self.changed('deals', id, fields);
    },
    removed(id) {
      self.removed('deals', id);
    }
  });

  self.ready();
  init = false;
  self.onStop(() => {
    if (handler) handler.stop();
  });
}
