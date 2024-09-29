import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import Security from '../../utils/security';

async function totalCAHistory() {
  Security.checkIfAdmin(this.userId);
  const dealsCursor = Deals.find({ status: 'completed' });
  const deals = dealsCursor.fetch();
  const total = deals.map((d) => d.amount).reduce((a, b) => a + b, 0);

  return {
    count: dealsCursor.count(),
    total
  };
}

async function totalCAsent() {
  Security.checkIfAdmin(this.userId);
  const dealsCursor = Deals.find({
    status: { $in: ['active', 'approved', 'suspended'] }
  });
  const deals = dealsCursor.fetch();
  const total = deals.map((d) => d.amount).reduce((a, b) => a + b, 0);

  return {
    count: dealsCursor.count(),
    total
  };
}

Meteor.methods({
  'audit.totalCAHistory': totalCAHistory,
  'audit.totalCAsent': totalCAsent
});
