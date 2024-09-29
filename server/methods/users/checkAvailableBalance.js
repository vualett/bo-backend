import { Meteor } from 'meteor/meteor';
import getBalance from '../../plaid/getBalance';

export default async function checkAvailableBalance(obj, paymentAmount) {
  const balances = await getBalance(obj);
  if (!balances) return;
  const balance = balances.available || balances.current;
  if (balance < paymentAmount) throw new Meteor.Error('INSUFFICIENT_FUNDS');
}
