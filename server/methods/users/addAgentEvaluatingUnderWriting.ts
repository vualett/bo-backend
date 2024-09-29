import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../utils/security';
import * as Sentry from '@sentry/node';
import logger from '../../logger/log';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import changeStage from './changeStage';
import { STAGE } from '../../consts/user';

const addAgentEvaluatingUnderWriting = async (userId: string): Promise<void> => {
  try {
    check(userId, String);
    const agentId = Meteor.userId();
    Security.checkIfAdmin(Meteor.userId());

    const user = await Meteor.users.findOneAsync({ _id: userId });

    if (!user) {
      throw new Meteor.Error('USER_NOT_FOUND');
    }

    if (
      user.assignedAgent &&
      user.offStage &&
      user.assignedAgent
        .filter(({ category }) => category === 'validation')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.agent.id === agentId &&
      user.offStage.stage === STAGE.UNDERWRITING.STAGE_4
    ) {
      await changeStage({ userId, stage: STAGE.UNDERWRITING.STAGE_5 });
    }
  } catch (error) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`users.addAgentEvaluatingUnderWriting [${userId}] ${message}`);
  }
};
export default addAgentEvaluatingUnderWriting;

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.addAgentEvaluatingUnderWriting'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: addAgentEvaluatingUnderWriting
});
