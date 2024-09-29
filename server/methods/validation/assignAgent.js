import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { capitalizeFirstLetterOfEachWord } from '../../utils/utils';
import insertLog from '../logs/insertGenericLog';
import startOfToday from 'date-fns/startOfToday';
export default async function assignAgent({ userId, category }) {
  check(userId, String);
  check(category, String);

  const by = {
    name: 'system'
  };

  let query = null;

  switch (category) {
    case 'seniorUnderwriter':
      query = {
        isAdmin: true,
        'roles.__global_roles__': 'seniorUnderwriter'
      };
      break;
    case 'juniorUnderwriter':
      query = {
        isAdmin: true,
        'roles.__global_roles__': 'juniorUnderwriter'
      };
      break;
    case 'validate':
      query = {
        isAdmin: true,
        'roles.access': 'validate'
      };
      break;
    case 'escalate':
      query = {
        isAdmin: true,
        'roles.access': 'escalate'
      };
      break;
    case 'reactivate':
      query = {
        isAdmin: true,
        'roles.access': 'reactivate'
      };
      break;

    case 'business':
      query = {
        isAdmin: true,
        'roles.access': 'setBusinessCategory'
      };
      break;

    default:
      query = {
        isAdmin: true,
        'roles.__global_roles__': {
          $in: ['validation']
        }
      };
      break;
  }

  const _agent = Meteor.users.findOne(
    {
      ...query,
      'status.lastLogin.date': {
        $gt: startOfToday()
      },
      'status.online': true
    },
    { sort: { assignCount: 1 } }
  );

  const agent =
    _agent ||
    Meteor.users.findOne(
      {
        isAdmin: true,

        'roles.__global_roles__': {
          $in: ['validation']
        },
        'status.lastLogin.date': {
          $gt: startOfToday()
        },
        'status.online': true
      },
      { sort: { assignCount: 1 } }
    );

  const assignedAgent = {
    category: 'validation',
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
          category: 'validation'
        }
      }
    }
  );

  // add the new one on users
  await Meteor.users.update(
    { _id: userId },
    {
      $addToSet: {
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
}
