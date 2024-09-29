import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';
import Invitations from '../../collections/invitations';

async function getPushPayrollMetrics({ startDate, endDate }) {
  check(startDate, Date);
  check(endDate, Date);
  Security.checkIfAdmin(this.userId);

  const result = await Invitations.rawCollection()
    .aggregate([
      {
        $match: {
          when: {
            $gt: startDate,
            $lte: endDate
          },
          'assignedAgent.category': 'push',
          'assignedAgent.agent.id': this.userId,
          by: this.userId,
          'metadata.source': 'friend',
          'metadata.friendId': { $exists: true }
        }
      },
      {
        $addFields: {
          accountCreated: {
            $cond: [
              {
                $not: '$userId'
              },
              0,
              1
            ]
          },
          accountCompleted: {
            $cond: [
              {
                $not: '$completeProfile'
              },
              0,
              1
            ]
          },
          dealTaken: {
            $cond: [
              {
                $not: '$firstCashAdvanceAmount'
              },
              0,
              1
            ]
          }
        }
      },
      {
        $group: {
          _id: '',
          accountCreated: {
            $sum: '$accountCreated'
          },
          accountCompleted: {
            $sum: '$accountCompleted'
          },
          dealTaken: {
            $sum: '$dealTaken'
          },
          total: {
            $sum: 1
          }
        }
      }
    ])
    .toArray();

  return result;
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.getPushPayrollMetrics'
};

DDPRateLimiter.addRule(method, 5, 1000);

Meteor.methods({
  [method.name]: getPushPayrollMetrics
});
