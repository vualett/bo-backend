import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import { Agenda, Job } from '@hokify/agenda';
import { sendReminderToTakeCashAdvance } from '../../methods/users/sendReminderToTakeCashAdvance';

export const JOB_NAME = 'sendReminderToTakeCashAdvanceJob';

const declareJob = async (job: Job<string>, done: (error?: Error | undefined) => void): Promise<void> => {
  try {
    await sendReminderToTakeCashAdvance({ userId: job.attrs.data });
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
    await Queue.create(JOB_NAME, userId).schedule('in 12 hours').unique({ 'data.userId': userId }).save();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;
    logger.error(`[sendReminderToTakeCashAdvanceJob] ${message}`);
    throw new Meteor.Error(message);
  }
};
