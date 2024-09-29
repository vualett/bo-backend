import { Meteor } from 'meteor/meteor';
import moment from 'moment';
import Deals from '../collections/deals';
import Security from '../utils/security';

async function dealsAnalytics() {
  Security.checkIfAdmin(this.userId);
  const data = Deals.find();

  return data;
}

async function duePayments() {
  Security.checkIfAdmin(this.userId);
  const start = moment().startOf('day').toDate();
  const end = moment().endOf('day').toDate();

  const data = await Deals.find({
    $and: [{ status: 'active' }, { 'payments.date': { $gte: start, $lt: end } }]
  }).fetch();

  const payments = [];

  data.forEach((d) => {
    const customer = Meteor.users.findOne({ _id: d.userId }, { fields: { firstName: 1, lastName: 1 } });

    d.payments
      .filter((p) => p.date >= start && p.date < end)
      .map((p) => ({ ...p, customer, deal: d }))
      .forEach((p) => payments.push(p));
  });

  return payments;
}

async function declinedPayments() {
  Security.checkIfAdmin(this.userId);
  const data = await Deals.find({
    $and: [
      { status: 'active' },
      {
        'payments.status': 'declined'
      }
    ]
  }).fetch();

  const payments = [];

  data.forEach((d) => {
    const customer = Meteor.users.findOne({ _id: d.userId }, { fields: { firstName: 1, lastName: 1 } });

    d.payments
      .filter((p) => p.status === 'declined')
      .map((p) => ({ ...p, customer, deal: d }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach((p) => payments.push(p));
  });

  return payments;
}

Meteor.methods({
  'analytics.deals': dealsAnalytics,
  'analytics.duePayments': duePayments,
  'analytics.declinedPayments': declinedPayments
});
