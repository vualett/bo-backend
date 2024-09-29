// create agenda job to get initial dwolla balance an store it in a document called "dwollaBalance", in metrics Collection, this job run every day at 7am.

import { Meteor } from 'meteor/meteor';
import Metrics from '../../../server/collections/metrics';
import { Agenda, Job } from '@hokify/agenda';
import getUalettFundingBalance from '../../methods/dwolla/getUalettFundingBalance';


export default async function getInitialDwollaBalanceJob(agenda: Agenda, cron: string): Promise<void> {
    const JobName = 'getInitialDwollaBalanceJob';

    agenda.define(JobName, async (job: Job, done: () => void) => {
        try {
            const balanceResult = await getUalettFundingBalance();
            const balance = Number(balanceResult.balance);

            await Metrics.updateAsync({ _id: 'dwollaBalance' }, { $set: { initialBalance: { balance, lastUpdated: new Date() } } }, { upsert: true });
            done();
        } catch (error: unknown) {
            const { message } = error as Meteor.Error;
            job.fail(message);
            done();
        }
    });

    await agenda.every(cron, JobName);
}