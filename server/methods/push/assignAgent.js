import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';
import { asyncForEach, capitalizeFirstLetterOfEachWord } from '../../utils/utils';
import Invitations from '../../collections/invitations';
import { insertInvitationNote } from '../notes';
import insertLog from '../logs/insertGenericLog';
import * as Sentry from '@sentry/node';
import logger from '../../logger/log';
import { ROLES } from '../../consts/roles';

async function assignAgent({ invitations, agentId, category }) {
  check(agentId, String);
  check(invitations, Array);

  Security.checkIfAdmin(this.userId);

  const agent = Meteor.users.findOne({ _id: agentId });

  if (!agent) throw new Meteor.Error('INVALID AGENT');

  const responsable = Meteor.users.findOne({ _id: this.userId });
  const by = {
    name: capitalizeFirstLetterOfEachWord(responsable.firstName),
    id: responsable._id
  };

  const matchErrors = [];

  await asyncForEach(invitations, async (invitation) => {
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

    if (invitation.userId) {
      // remove current agent from same category
      await Meteor.users.update(
        { _id: invitation.userId },
        {
          $pull: {
            assignedAgent: {
              category
            }
          }
        }
      );

      // add the new one
      await Meteor.users.update(
        { _id: invitation.userId },
        {
          $addToSet: {
            assignedAgent
          }
        }
      );

      Meteor.call('notes.insert', {
        message: `User assigned to ${capitalizeFirstLetterOfEachWord(
          agent.firstName
        )} ${capitalizeFirstLetterOfEachWord(agent.lastName)}`,
        where: 'user',
        userId: invitation.userId,
        by,
        type: 'status',
        flow: ROLES.ONBOARDING
      });
    } else {
      insertInvitationNote({
        message: `User assigned to ${capitalizeFirstLetterOfEachWord(
          agent.firstName
        )} ${capitalizeFirstLetterOfEachWord(agent.lastName)}`,
        where: 'invitation',
        invitationId: invitation.invitationId,
        by,
        type: 'status'
      });
    }

    // update user invitations
    await Invitations.update(
      { _id: invitation.invitationId },
      {
        $set: {
          assignedAgent
        }
      }
    );
  });

  return matchErrors;
}

export async function assignAgentPush(userId, invitationId) {
  try {
    const by = {
      name: 'system'
    };

    const agent = Meteor.users.findOne(
      {
        isAdmin: true,

        'roles.access': {
          $in: ['pushBusiness']
        }
      },
      { sort: { assignCount: 1 } }
    );

    const assignedAgent = {
      category: 'push',
      agent: {
        firstName: agent?.firstName ?? 'N/A',
        lastName: agent?.lastName ?? 'N/A',
        id: agent?._id ?? 'N/A'
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
            category: 'push'
          }
        }
      }
    );

    await Meteor.users.update(
      { _id: userId },
      {
        $addToSet: {
          assignedAgent
        }
      }
    );

    await Invitations.update(
      { _id: invitationId },
      {
        $set: {
          assignedAgent
        }
      }
    );

    // add count to agent
    if (agent !== undefined) {
      await Meteor.users.update(
        {
          _id: agent._id
        },
        {
          $inc: {
            assignCount: 1
          }
        }
      );

      insertLog(
        userId,
        `User assigned to ${capitalizeFirstLetterOfEachWord(agent.firstName)} ${capitalizeFirstLetterOfEachWord(
          agent.lastName
        )}`
      );
    }
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`aassignAgentPush: ${error}`);
  }
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'invitations.assignAgent'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: assignAgent
});
