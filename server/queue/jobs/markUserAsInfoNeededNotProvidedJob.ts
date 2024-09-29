import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import { Agenda, Job } from '@hokify/agenda';
import { markUserAsInfoNeededNotProvided } from '../../methods/users/markUserAsInfoNeededNotProvided';

export const JOB_NAME = 'markUserAsInfoNeededNotProvidedJob';

const declareJob = async (job: Job<string>, done: (error?: Error | undefined) => void): Promise<void> => {
  try {
    await markUserAsInfoNeededNotProvided({ userId: job.attrs.data });
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
    await Queue.create(JOB_NAME, userId).schedule('in 24 hours').unique({ 'data.userId': userId }).save();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;
    logger.error(`[markUserAsInfoNeededNotProvidedJob'] ${message}`);
    throw new Meteor.Error(message);
  }
};
