import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import { Agenda, Job } from '@hokify/agenda';
import { updateUserToCallback } from '../../methods/users/updateUserToCallback';

export const JOB_NAME = 'birthdaySchedulerUnderageJob';

interface Parameters {
  id: string;
  note: string;
  callbackDate: Date;
  isInvitation?: boolean;
}

const declareJob = async (job: Job<Parameters>, done: (error?: Error | undefined) => void): Promise<void> => {
  try {
    await updateUserToCallback(job.attrs.data);
    done();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;

    job.fail(message);
    done();
  }
};

export const defineJob = (Queue: Agenda): void => Queue.define(JOB_NAME, declareJob);

export const runJob = async (Queue: Agenda, item: Parameters): Promise<void> | never => {
  try {
    await Queue.create(JOB_NAME, item).schedule(item.callbackDate).unique({ 'data.id': item.id }).save();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;

    logger.error(`[FUNCTION:birthdaySchedulerUnderageJob] ${message}`);
    throw new Meteor.Error(message);
  }
};
