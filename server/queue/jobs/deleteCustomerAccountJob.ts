import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import { Agenda, Job } from '@hokify/agenda';
import { addWeeks } from 'date-fns';
import deleteCustomerAccount from '../../accounts/deleteCustomerAccount';

export const JOB_NAME = 'deleteCustomerAccount';

const declareJob = async (job: Job<string>, done: (error?: Error | undefined) => void): Promise<void> => {
  const userId = job.attrs.data;
  try {
    await deleteCustomerAccount(userId);
    done();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;

    job.fail(message);
    done();
  }
};

export const defineJob = (Queue: Agenda): void => Queue.define(JOB_NAME, declareJob);

export const runJob = async (Queue: Agenda, userId: string): Promise<void> | never => {
  try {
    await Queue.create(JOB_NAME, userId).schedule(addWeeks(new Date(), 2)).unique({ userId }).save();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;

    logger.error(`[FUNCTION:deleteCustomerAccount] ${message}`);
    throw new Meteor.Error(message);
  }
};
