import { Meteor } from 'meteor/meteor';
import { Agenda, Job } from '@hokify/agenda';
import logger from '../../logger/log';
import { ROLES } from '../../consts/roles';

export const JOB_NAME = 'removeUnqualifiedAssignment';

interface IItem {
  userId: string;
}

const declareJob = async (job: Job<IItem>, done: (error?: Error | undefined) => void): Promise<void> => {
  const { userId } = job.attrs.data;

  try {
    await Meteor.users.updateAsync(
      { _id: userId },
      {
        $pull: {
          assignedAgent: {
            category: ROLES.ONBOARDING
          }
        }
      }
    );

    done();
  } catch (error: unknown) {
    logger.error(`removeUnqualifiedAssignment ${JSON.stringify(error)}`);
    job.fail(error as Error);
    done();
  }
};

export const defineJob = (Queue: Agenda): void => Queue.define(JOB_NAME, declareJob);

export const runJob = async (Queue: Agenda, item: IItem): Promise<void> | never => {
  if (item.userId != null && item.userId.length === 0) {
    return;
  }

  try {
    const job = Queue.create(JOB_NAME, item);
    job.schedule('in 1 month');
    job.unique({ 'data.userId': item.userId });
    await job.save();
  } catch (error: unknown) {
    logger.error(`removeUnqualifiedAssignment ${JSON.stringify(error)}`);
    throw new Meteor.Error(JSON.stringify(error));
  }
};
