import { check } from 'meteor/check';
import Security from '../utils/security';
import Dwolla from './dwolla';
import { Meteor } from 'meteor/meteor';

export default async function cancelTransfer(transferUrl) {
  check(transferUrl, String);
  Security.checkIfAdmin(Meteor.userId());
  const requestBody = {
    status: 'cancelled'
  };

  return Dwolla().post(transferUrl, requestBody);
}
