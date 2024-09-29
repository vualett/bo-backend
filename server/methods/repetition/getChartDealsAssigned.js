import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';
import Deals from '../../collections/deals';

function getChartDealsAssigned({ category, startDate, endDate }) {
  check(category, String);
  Security.checkIfAdmin(this.userId);

  return Deals.rawCollection()
    .aggregate([
      {
        $match: {
          completeAt: {
            $gte: startDate,
            $lt: endDate
          },
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
          }
        }
      }
    ])
    .toArray();
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.getChartDealsAssigned'
};

DDPRateLimiter.addRule(method, 2, 1000);

Meteor.methods({
  [method.name]: getChartDealsAssigned
});
