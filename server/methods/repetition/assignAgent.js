import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';
import { asyncForEach, capitalizeFirstLetterOfEachWord } from '../../utils/utils';
import Deals from '../../collections/deals';

function checkIfLastDeal(userId, dealId) {
  const latestDeal = Deals.findOne({ userId }, { sort: { completeAt: -1 } });
  return latestDeal?._id === dealId;
}

async function assignAgent({ deals, agentId, category }) {
  check(agentId, String);
  check(deals, Array);

  Security.checkIfAdmin(this.userId);

  const agent = agentId !== 'na' ? Meteor.users.findOne({ _id: agentId }) : true;

  if (!agent) throw new Meteor.Error('INVALID AGENT');

  const responsable = Meteor.users.findOne({ _id: this.userId });
  const by = {
    name: capitalizeFirstLetterOfEachWord(responsable.firstName),
    id: responsable._id
  };

  let matchErrors = [];

  await asyncForEach(deals, async (deal) => {
    if (checkIfLastDeal(deal.userId, deal.dealId)) {
      const assignedAgent = {
        category,
        agent: {
          firstName: agent.firstName,
          lastName: agent.lastName,
          id: agent._id
        },
        timestamp: new Date(),
        by
      };

      // remove current agent from same category on users
      await Meteor.users.update(
        { _id: deal.userId },
        {
          $pull: {
            assignedAgent: {
              category: {
                $in: [category]
              }
            }
          }
        }
      );

      // remove current agent from same category on deals
      await Deals.update(
        { _id: deal.dealId },
        {
          $pull: {
            assignedAgent: {
              category
            }
          }
        }
      );

      if (agentId !== 'na') {
        // add the new one on users
        await Meteor.users.update(
          { _id: deal.userId },
          {
            $addToSet: {
              assignedAgent
            }
          }
        );

        // add the new one on deals
        await Deals.update(
          { _id: deal.dealId },
          {
            $addToSet: {
              assignedAgent
            }
          }
        );
      }

      Meteor.call('notes.insert', {
        message:
          agentId !== 'na'
            ? `User assigned to ${capitalizeFirstLetterOfEachWord(agent.firstName)} ${capitalizeFirstLetterOfEachWord(
                agent.lastName
              )}`
            : 'Repetition assignation removed',
        where: 'user',
        userId: deal.userId,
        by,
        type: 'status',
        flow: 'repetition'
      });
    } else {
      matchErrors.push(deal);
    }
  });

  return matchErrors;
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.assignAgent'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: assignAgent
});
