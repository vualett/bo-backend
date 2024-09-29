import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Deals from '../../collections/deals';

import getTransfersAfterCA from '../dwolla/getTransfersAfterCA';
import Security from '../../utils/security';

export default async function auditDwollaTransfers(id) {
  check(id, String);
  Security.checkIfAdmin(Meteor.userId());

  const CA = Deals.findOne({ _id: id });

  const user = Meteor.users.findOne({ _id: CA.userId });

  const results = await getTransfersAfterCA(user, CA);
  return results;
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.auditDwollaTransfers'
};

DDPRateLimiter.addRule(method, 1, 500);

Meteor.methods({
  [method.name]: auditDwollaTransfers
});
