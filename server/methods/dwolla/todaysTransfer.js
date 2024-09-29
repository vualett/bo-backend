import { Meteor } from 'meteor/meteor';
import format from 'date-fns/format';
import addDays from 'date-fns/addDays';
import Dwolla from '../../dwolla/dwolla';
import Security from '../../utils/security';
import { DWOLLA_ACCOUNT } from '../../keys';

async function todaysTransfer(date) {
  this.unblock();
  Security.checkIfAdmin(this.userId);
  const startDate = format(new Date(date || null), 'yyyy-MM-dd');
  const endDate = format(addDays(new Date(date || null), 1), 'yyyy-MM-dd');

  const result = await Dwolla().get(`${DWOLLA_ACCOUNT}/transfers?&limit=200&startDate=${startDate}&endDate=${endDate}`);
  const { _embedded } = result.body;

  const payments = _embedded.transfers.map((p) => ({
    amount: p.amount.value,
    status: p.status,
    date: p.created
  }));

  return {
    payments
  };
}

Meteor.methods({
  'dwolla.todaysTransfer': todaysTransfer
});
