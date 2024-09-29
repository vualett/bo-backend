import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';
import { capitalizeFirstLetterOfEachWord } from '../../utils/utils';
import Invitations from '../../collections/invitations';
import Deals from '../../collections/deals';
import { ROLES } from '../../consts/roles';

async function assignAgent({ userId, agentId, category }) {
  Security.checkIfAdmin(this.userId);

  check(agentId, String);
  check(userId, String);
  check(category, String);

  if (![ROLES.ONBOARDING, ROLES.SALES, 'repetition', 'validation'].includes(category)) throw new Meteor.Error('INVALID CATEGORY');

  const user = Meteor.users.findOne({ _id: userId });
  if (!user) throw Meteor.Error('INVALID USER');

  if (category === 'repetition' && user?.metrics?.cashAdvances?.count < 1) throw new Meteor.Error('ONBOARDING CUSTOMER');
  if (category === ROLES.ONBOARDING && user?.metrics?.cashAdvances?.count >= 1) throw new Meteor.Error('REPETITION CUSTOMER');

  if (category === ROLES.ONBOARDING && agentId === 'na') throw new Meteor.Error('FEATURE TEMPORARILY DISABLED');

  const agent = agentId !== 'na' ? Meteor.users.findOne({ _id: agentId }) : true;
  if (!agent) throw new Meteor.Error('INVALID AGENT');

  const responsable = Meteor.users.findOne({ _id: this.userId });
  const by = {
    name: capitalizeFirstLetterOfEachWord(responsable.firstName),
    id: responsable._id
  };

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
    { _id: userId },
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

  if (agentId !== 'na') {
    // add the new one on users
    await Meteor.users.update(
      { _id: userId },
      {
        $addToSet: {
          assignedAgent
        }
      }
    );
  }

  if (category === ROLES.ONBOARDING) {
    // update user invitations
    await Invitations.update(
      { userId: userId },
      {
        $set: {
          assignedAgent
        }
      }
    );
  }

  if (category === 'repetition') {
    // find last completed deal
    const latestDeal = Deals.findOne({ userId, status: 'completed' }, { sort: { completeAt: -1 } });

    // remove current agent from same category on the deal
    await Deals.update(
      { _id: latestDeal._id },
      {
        $pull: {
          assignedAgent: {
            category: 'repetition'
          }
        }
      }
    );

    // add the new agent to the array
    await Deals.update(
      { _id: latestDeal._id },
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
    userId: userId,
    by,
    type: 'status',
    flow: category
  });
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.assignAgent'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: assignAgent
});
