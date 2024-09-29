import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';
import Deals from '../../collections/deals';

function isAdmin(userId) {
  const user = Meteor.users.findOne({ _id: userId });
  if (user && user.isAdmin) return true;
  return false;
}

function dealsPayments({ query }) {
  Security.checkLoggedIn(this.userId);
  if (!isAdmin(this.userId)) throw new Meteor.Error('error');

  const self = this;
  let handler = null;
  let init = true;

  const options = {
    sort: { status: -1, createdAt: -1 }
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

Meteor.publish({ dealsPayments });
