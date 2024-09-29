import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../../utils/security';
import Dwolla from '../../../dwolla/dwolla';

export default async function customerRecord(customerURL) {
  const customer = await Dwolla()
    .get(customerURL)
    .then((r) => r.body);

  const funding = await Dwolla()
    .get(`${customerURL}/funding-sources`)
    .then((r) => r.body._embedded && r.body._embedded['funding-sources']);

  const activeFunding = funding.filter((f) => !f.removed);
  return { ...customer, fundingSources: activeFunding };
}

Meteor.methods({
  'users.dwollaCustomerRecord': function customerRecordMethod(userID) {
    check(userID, String);
    Security.checkRole(this.userId, 'super-admin');
    const user = Meteor.users.findOne({ _id: userID });
    const { dwollaCustomerURL } = user;
    return customerRecord(dwollaCustomerURL);
  }
});
