/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Job } from '@hokify/agenda';
import { Meteor } from 'meteor/meteor';
import logger from '../../../server/logger/log';
import { approveDeal } from '../../methods/deals/approveDeal';
import Deals from '../../collections/deals';
import Security from '../../../server/utils/security';
import { Settings } from '../../collections/settings';
import getUalettFundingBalance from '../../methods/dwolla/getUalettFundingBalance';

async function approveDeals(): Promise<string> {

    const deals = await Deals.find({ status: 'requested' }, { sort: { createdAt: 1 } }).fetchAsync();

    for (const deal of deals) {
        try {
            await approveDeal(deal._id);
        } catch (error: unknown) {
            logger.error(`Error approving deal ${deal._id}: ${error}`);
        }
    }
    return `Approved ${deals.length} deals`;
}

export default async function approvePendingDealTransfers(job: Job, done: () => void): Promise<void> {
    try {
        const autoDealApproval = await Settings.findOneAsync({ _id: 'autoDealApproval' });
        if (autoDealApproval && !autoDealApproval.value) { return done(); }

        const balanceResult = await getUalettFundingBalance();
        const balance = Number(balanceResult.balance);
        if (balance < 5000) { return done(); }


        await approveDeals();
        done();
    } catch (error: unknown) {
        const { message } = error as Meteor.Error;

        job.fail(message);
        logger.error(`Error running job approvePendingDealTransfers: ${message}`);

        done();
    }
}

Meteor.methods({
    'job.approvePendingDealTransfers': async function approvePendingDealTransfersMethod(): Promise<string> {
        Security.checkRole(Meteor.userId(), 'super-admin');
        return await approveDeals();
    }
});