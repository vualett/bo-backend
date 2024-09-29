import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import Security from '../../utils/security';

function process(data) {
  const totalAmount = data.map(({ amount }) => amount).reduce((a, b) => a + b, 0);

  const paidAmount = data.map(({ paid }) => paid).reduce((a, b) => a + b, 0);

  return { totalAmount, cashAdvanceCount: data.length, paidAmount };
}

export default function accountsInDefault() {
  function transform(doc) {
    const user = Meteor.users.findOne({ _id: doc.userId }, { fileds: { firstName: 1, lastName: 1 } });

    const paid = doc.payments
      .filter(({ status }) => status === 'paid')
      .map(({ amount }) => amount)
      .reduce((a, b) => a + b, 0);

    return { ...doc, user, paid };
  }

  const query = { status: 'suspended' };
  const deals = Deals.find(query, { transform }).fetch();

  return {
    deals,
    processed: process(deals)
  };
}

Meteor.methods({
  'accounting.accountsInDefault': function accountsInDefaultMethod() {
    Security.checkIfAdmin(this.userId);
    return accountsInDefault();
  }
});
