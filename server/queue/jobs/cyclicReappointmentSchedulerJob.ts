import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import { Agenda, Job } from '@hokify/agenda';
import cyclicReappointmentScheduler from '../../methods/deals/cyclicReappointmentScheduler';
import { ENV } from '../../keys';

export const JOB_NAME = 'cyclicReappointmentScheduler';
const RUNNING_TIME = ENV === 'production' ? '8:00pm' : 'in 2 seconds';

const declareJob = async (job: Job<string>, done: (error?: Error | undefined) => void): Promise<void> => {
  try {
    await cyclicReappointmentScheduler(job.attrs.data);
    done();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;

    job.fail(message);
    done();
  }
};

export const defineJob = (Queue: Agenda): void => Queue.define(JOB_NAME, declareJob);

export const runJob = async (Queue: Agenda, dealId: string): Promise<void> | never => {
  try {
    await Queue.create(JOB_NAME, dealId).schedule(RUNNING_TIME).unique({ 'data.dealId': dealId }).save();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;

    logger.error(`[FUNCTION:cyclicReappointmentScheduler] ${message}`);
    throw new Meteor.Error(message);
  }
};
