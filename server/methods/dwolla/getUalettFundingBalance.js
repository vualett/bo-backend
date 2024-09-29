import { Meteor } from 'meteor/meteor';
import Dwolla from '../../dwolla/dwolla';
import Security from '../../utils/security';
import { DWOLLA_FUNDING_SOURCES } from '../../keys';

export default async function getUalettFundingBalance() {
  const result = await Dwolla().get(`${DWOLLA_FUNDING_SOURCES}/balance`);
  const balance = result.body.balance.value;

  return { balance };
}

Meteor.methods({
  'dwolla.getUalettFundingBalance': async function getUalettFundingBalanceMethod() {
    this.unblock();
    Security.checkIfAdmin(this.userId);
    return getUalettFundingBalance();
  }
});
