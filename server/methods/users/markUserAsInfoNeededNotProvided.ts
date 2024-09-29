import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import { STATUS, SUB_STATUS } from '../../consts/user';
import changeStatus from './changeStatus';
import changeSubStatus from './changeSubStatus';
import { differenceInHours } from 'date-fns';

interface Paramaters {
  userId: string;
}

export async function markUserAsInfoNeededNotProvided(props: Paramaters): Promise<void> {
  const { userId } = props;

  try {
    const user = await Meteor.users.findOneAsync({ _id: userId });

    if (!user) {
      throw new Meteor.Error('USER_NOT_FOUND');
    }

    if (user.offStage?.status === STATUS.NEED_MORE_INFO && user.offStage?.needMoreInfoDate) {
      if (differenceInHours(new Date(), new Date(user.offStage?.needMoreInfoDate as Date)) >= 24) {
        await changeStatus({ userId, status: STATUS.UNQUALIFIED_ELIGIBLE_FOR_RE_EVAL, agentId: undefined });
        await changeSubStatus({
          userId,
          subStatus: SUB_STATUS.INFORMATION_NEEDED_NOT_PROVIDED,
          agentId: undefined,
          callbackDate: undefined
        });
      }
    }
  } catch (error) {
    const { message } = error as Meteor.Error;
    logger.error(`[markUserAsInfoNeededNotProvided] {${userId}} ${message}`);
  }
}
