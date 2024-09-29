import { Meteor } from 'meteor/meteor';
import Dwolla from '../../dwolla/dwolla';
import Security from '../../utils/security';
import { DWOLLA_ACCOUNT } from '../../keys';

export default async function getUalettFundingBalanceInTransit() {
  const result = await Dwolla().get(`${DWOLLA_ACCOUNT}/transfers?&status=pending&limit=200&startAmount=9000`);
  const payments = result.body._embedded.transfers
    .filter((p) => p.status === 'pending')
    .map((p) => ({
      amount: p.amount.value,
      status: p.status,
      date: p.created
    }));

  return {
    count: payments.length,
    totalAmount: payments.map(({ amount }) => Number(amount)).reduce((a, b) => a + b, 0),
    payments
  };
}

Meteor.methods({
  'dwolla.getUalettFundingBalanceInTransit': function getUalettFundingBalanceInTransit() {
    Security.checkIfAdmin(this.userId);
    this.unblock();
    return getUalettFundingBalanceInTransit();
  }
});
