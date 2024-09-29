import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../../utils/security';
import { insertDataChangesLog } from '../../../dataChangesLogs';

function setTags({ userID, tags }) {
  check(tags, Array);
  Security.checkRole(this.userId, ['admin', 'technical', 'manager', 'control']);

  const testResult = tags.every((tag) => typeof tag === 'string');

  if (!testResult) throw new Meteor.Error('BAD_INPUT');

  const customer = Meteor.users.findOne({ _id: userID });
  if (!customer) throw new Meteor.Error('CUSTOMER_NOT_FOUND');

  insertDataChangesLog({
    where: 'users',
    documentID: userID,
    operation: 'update',
    method: 'setControlTags',
    createdBy: Meteor.userId(),
    old_data: customer.controlTags,
    new_data: tags
  });

  const updated = Meteor.users.update({ _id: userID }, { $set: { controlTags: tags } });

  if (updated) return true;
  return false;
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.set.controlTags'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: setTags
});
