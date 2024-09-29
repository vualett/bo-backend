import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';

function getChartUsersAssigned({ category }) {
  check(category, String);
  Security.checkIfAdmin(this.userId);

  return Meteor.users
    .rawCollection()
    .aggregate([
      {
        $match: {
          assignedAgent: {
            $elemMatch: {
              category,
              'agent.id': this.userId
            }
          }
        }
      },
      {
        $group: {
          _id: '$interaction.status',
          count: {
            $sum: 1
          },
          activeDeal: {
            $sum: {
              $cond: [
                {
                  $ne: ['$currentCashAdvance', false]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ])
    .toArray();
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.getChartUsersAssigned'
};

DDPRateLimiter.addRule(method, 2, 1000);

Meteor.methods({
  [method.name]: getChartUsersAssigned
});
