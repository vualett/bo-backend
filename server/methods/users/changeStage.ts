import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { insertTimelog } from '../timelogs/insertTimelog';
import capitalizeFirstLetterOfEachWord from '../../utils/capitalizeFirstLetterOfEachWord';
import { STAGE_BY_ROLE_ASSIGNMENT } from '../../consts/user';

interface Params {
  userId: string;
  stage: Meteor.User['offStage']['stage'];
}

const changeStage = async ({ userId, stage }: Params): Promise<void> => {
  try {
    check(userId, String);
    check(stage, String);

    const user = await Meteor.users.findOneAsync({ _id: userId });

    if (!user) throw new Meteor.Error('USER_NOT_FOUND');

    const userModified: Mongo.Modifier<Meteor.User> = {
      $unset: {
        'offStage.status': '',
        'offStage.subStatus': ''
      },
      $set: {
        'offStage.stage': stage
      }
    };

    const assignedAgent = user.assignedAgent?.find(
      (agent) => agent.category === STAGE_BY_ROLE_ASSIGNMENT[stage as keyof typeof STAGE_BY_ROLE_ASSIGNMENT]
    );

    await Meteor.users.updateAsync({ _id: userId }, userModified);

    await insertTimelog({
      userId,
      dealId: null,
      event: `Stage changed to ${stage}`,
      type: 'account',
      eventType: 'user',
      _by: assignedAgent?.agent
        ? {
            name: `${capitalizeFirstLetterOfEachWord(assignedAgent.agent.firstName)} ${capitalizeFirstLetterOfEachWord(
              assignedAgent.agent.lastName
            )}`,
            category: assignedAgent.category,
            id: assignedAgent.agent.id
          }
        : { name: 'System', id: 'system' },
      metadata: null
    });
  } catch (error) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`users.changeStage [${userId}] ${message}`);
  }
};

export default changeStage;

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.changeStage'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: changeStage
});
