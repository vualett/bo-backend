/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import { Agenda, Job } from '@hokify/agenda';
import { approveDeal } from '../../methods/deals/approveDeal';
import { Settings } from '../../collections/settings';

export const JOB_NAME = 'approveDealTransfer';
const RUNNING_TIME = 'in 1 minute';


const declareJob = async (job: Job<string>, done: (error?: Error | undefined) => void): Promise<void> => {
    const dealId = job.attrs.data;
    try {
        const autoDealApproval = await Settings.findOneAsync({ _id: 'autoDealApproval' });
        if (autoDealApproval && !autoDealApproval.value) { return done(); }
        await approveDeal(dealId);
        done();
    } catch (error: unknown) {
        const { message } = error as Meteor.Error;

        job.fail(message);
        done();
    }
};

export const defineJob = (Queue: Agenda): void => Queue.define(JOB_NAME, declareJob);

export const runJob = async (Queue: Agenda, item: string): Promise<void> | never => {
    try {
        await Queue.create(JOB_NAME, item).schedule(RUNNING_TIME).unique({ 'data': item }).save();
    } catch (error: unknown) {
        const { message } = error as Meteor.Error;

        logger.error(`[FUNCTION:${JOB_NAME}] ${message}`);
        throw new Meteor.Error(message);
    }
};

export default { JOB_NAME, defineJob, runJob };

