import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';
import Invitations from '../../collections/invitations';

function getChartInvitationsAssigned({ category, startDate, endDate }) {
  check(category, String);
  Security.checkIfAdmin(this.userId);

  return Invitations.rawCollection()
    .aggregate([
      {
        $match: {
          when: {
            $gte: startDate,
            $lt: endDate
          },
          'assignedAgent.category': category,
          'assignedAgent.agent.id': this.userId
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
  name: 'users.getChartInvitationsAssigned'
};

DDPRateLimiter.addRule(method, 2, 1000);

Meteor.methods({
  [method.name]: getChartInvitationsAssigned
});
