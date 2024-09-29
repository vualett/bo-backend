import { Meteor } from 'meteor/meteor';
import Dwolla from './dwolla';
import Security from '../utils/security';

export default async function getTransfers(customerUrl) {
  return Dwolla()
    .get(`${customerUrl}/transfers`)
    .then((res) => res.body._embedded.transfers);
}

Meteor.methods({
  'dwolla.getTransfers': function dwollaGetTransfer(customerUrl) {
    Security.checkRole(this.userId, 'super-admin');
    const result = getTransfers(customerUrl);
    return result;
  }
});
