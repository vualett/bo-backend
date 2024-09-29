import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';

import assignAgent from '../validation/assignAgent';
import Security from '../../../server/utils/security';
import * as Sentry from '@sentry/node';
export async function asssing(): Promise<void> {
  try {
    Security.checkRole(Meteor.userId(), ['technical', 'manager', 'super-admin']);

    const _pipeline = [
      {
        $match: {
          $or: [
            {
              $and: [
                {
                  'status.verified': {
                    $eq: false
                  }
                },
                {
                  'status.qualify': {
                    $eq: true
                  }
                },
                {
                  'emails.verified': {
                    $eq: true
                  }
                },
                {
                  hasFunding: {
                    $eq: true
                  }
                },
                {
                  hasDriverLicense: {
                    $eq: true
                  }
                }
              ]
            },
            {
              'status.upgradeRequested': {
                $eq: true
              }
            },
            {
              'status.reactivationRequested': {
                $eq: true
              }
            }
          ]
        }
      },
      {
        $match: {
          $or: [
            {
              'assignedAgent.category': {
                $ne: 'validation'
              }
            },
            {
              'assignedAgent.category': {
                $eq: 'validation'
              },
              'assignedAgent.agent.firstName': 'N/A'
            }
          ]
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          status: {
            $cond: [
              {
                $eq: ['$status.upgradeRequested', true]
              },
              'escalate',
              {
                $cond: [
                  {
                    $eq: ['$status.reactivationRequested', true]
                  },
                  'reactivate',
                  'validate'
                ]
              }
            ]
          },
          metricsCount: { $ifNull: ['$metrics.cashAdvances.count', 0] }
        }
      }
    ];
    const users = await Meteor.users.rawCollection().aggregate(_pipeline).toArray();

    for (const user of users) {
      if (user?.metricsCount <= 0) {
        await assignAgent({
          userId: user?.userId as string,
          category: 'seniorUnderwriter'
        });
      } else {
        await assignAgent({
          userId: user?.userId as string,
          category: user?.status as string
        });
      }
    }
  } catch (error) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`validation.assingGroup ${message}`);
  }
}
Meteor.methods({
  'validation.assingGroup': asssing
});
