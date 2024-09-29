import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../utils/security';
import Deals from '../../collections/deals';

export default function requestedDeals({ limit }) {
  check(limit, Number);
  Security.checkLoggedIn(this.userId);
  const self = this;
  let handler = null;
  let init = true;

  const options = {
    sort: { createdAt: 1 },
    limit: limit || 20
  };
  function _transform(id, doc) {
    const newDoc = doc;

    newDoc.owner =
      Meteor.users.findOne(
        { _id: doc.userId },
        {
          fields: {
            firstName: 1,
            lastName: 1,
            hasDriverLicense: 1,
            metrics: 1,
            needsAudit: 1,
            bankAccountNeedsUpdate: 1
          }
        }
      ) || {};

    return newDoc;
  }
  const query = { status: 'requested' };

  handler = Deals.find(query, options).observeChanges({
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
