import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';
import { ROLES } from '../../consts/roles';

function getPushAccCount() {
  Security.checkIfAdmin(this.userId);
  const incomplete = Meteor.users
    .find({
      $and: [
        { 'status.qualify': { $eq: true } },
        { 'status.verified': { $eq: false } },
        {
          assignedAgent: {
            $elemMatch: {
              category: ROLES.ONBOARDING,
              'agent.id': this.userId
            }
          }
        },
        {
          $or: [
            { hasFunding: { $in: [false] } },
            { hasDriverLicense: { $in: [false] } },
            { 'emails.verified': { $eq: false } }
          ]
        }
      ]
    })
    .count();

  const validation = Meteor.users
    .find({
      assignedAgent: {
        $elemMatch: {
          category: ROLES.ONBOARDING,
          'agent.id': this.userId
        }
      },
      $or: [
        {
          $and: [
            { 'status.verified': { $eq: false } },
            { 'status.qualify': { $eq: true } },
            { 'emails.verified': { $eq: true } },
            { hasFunding: { $eq: true } },
            { hasDriverLicense: { $eq: true } }
          ]
        },
        {
          'status.upgradeRequested': { $eq: true }
        },
        {
          'status.reactivationRequested': { $eq: true }
        }
      ]
    })
    .count();

  const check = Meteor.users
    .find({
      assignedAgent: {
        $elemMatch: {
          category: ROLES.ONBOARDING,
          'agent.id': this.userId
        }
      },
      $and: [
        { 'status.verified': { $eq: true } },
        { 'status.qualify': { $eq: true } },
        { currentCashAdvance: { $eq: false } },
        { 'metrics.cashAdvances.count': { $in: [0, null] } }
      ]
    })
    .count();

  return {
    incomplete,
    validation,
    check
  };
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.getPushAccCount'
};

DDPRateLimiter.addRule(method, 2, 1000);

Meteor.methods({
  [method.name]: getPushAccCount
});
