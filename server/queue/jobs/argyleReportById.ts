import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import { Agenda, Job } from '@hokify/agenda';
import { addSeconds } from 'date-fns';
import getArgyleReportsById from '../../methods/argyle/argyleMethods/getReportsById';

export const JOB_NAME = 'getReportById';

const declareJob = async (job: Job<string>, done: (error?: Error | undefined) => void): Promise<void> => {
  const reportId = job.attrs.data;
  try {
    await getArgyleReportsById(reportId);
    done();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;

    job.fail(message);
    done();
  }
};

export const defineJob = (Queue: Agenda): void => Queue.define(JOB_NAME, declareJob);

export const runJob = async (Queue: Agenda, reportId: string): Promise<void> | never => {
  try {
    await Queue.create(JOB_NAME, reportId).schedule(addSeconds(new Date(), 20)).unique({ reportId }).save();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;

    logger.error(`[FUNCTION:getReportById] ${message}`);
    throw new Meteor.Error(message);
  }
};
