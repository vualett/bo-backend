import { Meteor } from 'meteor/meteor';
import twilio from 'twilio';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import insertLog from '../logs/insertGenericLog';
import { capitalizeFirstLetterOfEachWord } from '../../utils/utils';
import { ROLES } from '../../consts/roles';
import {
  TWILIO_CONTACT_CENTER_ACCOUNT_SID,
  TWILIO_CONTACT_CENTER_AUTH_TOKEN,
  TWILIO_CONTACT_CENTER_WORKSPACE
} from '../../keys';
import { WorkerInstance } from 'twilio/lib/rest/taskrouter/v1/workspace/worker';
import Invitations from '../../collections/invitations';

interface IParams {
  category: string;
  userId: string;
}

async function getAgentsAvailableFromTwillio(): Promise<WorkerInstance[]> {
  const client = twilio(TWILIO_CONTACT_CENTER_ACCOUNT_SID, TWILIO_CONTACT_CENTER_AUTH_TOKEN);

  const result = await client.taskrouter.workspaces(TWILIO_CONTACT_CENTER_WORKSPACE as string).workers.list();

  const twillioAvailableAgents = result.filter((item) => item.activityName === 'Available');

  if (twillioAvailableAgents.length === 0) {
    throw new Meteor.Error(404, 'NO_AGENTS_AVAILABLE');
  }
  return twillioAvailableAgents;
}

async function getAvailableForAssignmentAgent(
  twillioAgents: WorkerInstance[],
  category: string
): Promise<Meteor.User | null> {
  const categoryAgents = await Meteor.users
    .find({ 'roles.__global_roles__': { $nin: ['manager'], $in: [category] } })
    .fetchAsync();

  if (categoryAgents.length === 0) {
    return null;
  }

  const emailTwillioAvailableAgents = twillioAgents.map((item) => item.friendlyName);

  const categoryTwillioAvailableAgents = categoryAgents.filter(
    (item) => item.emails && emailTwillioAvailableAgents.includes(item.emails[0].address)
  );

  if (categoryTwillioAvailableAgents.length === 0) {
    return null;
  }

  const selectedAgent = categoryTwillioAvailableAgents.sort((a, b) => (a?.assignCount ?? 0) - (b?.assignCount ?? 0))[0];

  return selectedAgent;
}

async function applyAssignmentOfAgent(
  agent: { id: string; firstName: string; lastName: string },
  user: Meteor.User,
  category: string
): Promise<void> {
  try {
    const updated = await Meteor.users.updateAsync(
      { _id: user._id },
      {
        $addToSet: {
          assignedAgent: {
            category,
            timestamp: new Date(),
            by: { name: 'system' },
            agent: {
              firstName: agent.firstName,
              lastName: agent.lastName,
              id: agent.id
            }
          }
        }
      }
    );

    if (updated) {
      await Meteor.users.updateAsync(
        { _id: agent.id },
        {
          $inc: {
            assignCount: 1
          }
        }
      );

      insertLog(
        user._id,
        `User assigned to ${capitalizeFirstLetterOfEachWord(agent.firstName) as string} ${
          capitalizeFirstLetterOfEachWord(agent.lastName) as string
        }`
      );
    }
  } catch (error) {
    throw error;
  }
}

export async function assignAgentToUser(params: IParams): Promise<void> {
  const { userId, category } = params;

  try {
    const user = Meteor.users.findOne({ _id: userId });

    if (!user) {
      throw new Meteor.Error(404, 'USER_NOT_FOUND');
    }

    if (category === ROLES.SALES) {
      const hasOnboardingAssignedAgent = user.assignedAgent?.find((item) => item.category === ROLES.ONBOARDING);
      if (hasOnboardingAssignedAgent) {
        await Meteor.users.updateAsync(
          { _id: user._id },
          {
            $pull: {
              assignedAgent: {
                category: ROLES.ONBOARDING
              }
            }
          }
        );
      }
    }

    if (category === ROLES.ONBOARDING) {
      const userInvitation = Invitations.findOne({ userId: user._id });
      if (userInvitation) {
        const hasAssignedAgent = userInvitation.assignedAgent?.category === ROLES.ONBOARDING ? true : false;
        if (hasAssignedAgent) {
          await applyAssignmentOfAgent(userInvitation.assignedAgent.agent, user, category);
          return;
        }
      }
    }

    const twillioAgents = await getAgentsAvailableFromTwillio();

    const agentAvailable = await getAvailableForAssignmentAgent(twillioAgents, category);

    if (!agentAvailable) {
      throw new Meteor.Error(404, 'NO_AGENTS_AVAILABLE');
    }

    await applyAssignmentOfAgent(
      {
        id: agentAvailable._id,
        firstName: agentAvailable.firstName,
        lastName: agentAvailable.lastName
      },
      user,
      category
    );
  } catch (error) {
    const { message } = error as Meteor.Error;
    Sentry.captureException(error);
    logger.error(`[assignAgentToUser] {${userId}} ${message}`);
  }
}
