/* eslint-disable @typescript-eslint/no-unsafe-call */
import { fetch, Headers } from 'meteor/fetch';
import { Job } from '@hokify/agenda';
import { transferToBank } from '../../methods/dwolla/transferToBank';
import getUalettFundingBalance from '../../methods/dwolla/getUalettFundingBalance';
import { Settings } from '../../collections/settings';
import Metrics from '../../../server/collections/metrics';
import numeral from 'numeral';
import * as Sentry from '@sentry/node';
import logger from '../../logger/log';
import { BOTS_WEBHOOKS_DWOLLA_BOT, DWOLLA_BANK_FUNDING_SOURCE_NAME } from '../../keys';


async function sendMessageToDwollaBot(totalAmount: number): Promise<void> {
    if (!BOTS_WEBHOOKS_DWOLLA_BOT) return;

    const msg = `*${numeral(totalAmount).format('$0,0')}* transferred to *${DWOLLA_BANK_FUNDING_SOURCE_NAME as string}*`;

    await fetch(BOTS_WEBHOOKS_DWOLLA_BOT, {
        method: 'POST',
        headers: new Headers({
            'Content-Type': 'application/json; charset=utf-8'
        }),
        body: JSON.stringify({
            text: msg
        })
    });
}


export default async function transferDwollaBalanceToBank(job: Job, done: () => void): Promise<void> {
    try {
        const isBatchBalanceToBankEnabled = await Settings.findOneAsync({ _id: 'batchBalanceToBank' });
        if (isBatchBalanceToBankEnabled && !isBatchBalanceToBankEnabled.value) { return done(); }

        const { balance } = await getUalettFundingBalance() as { balance: string };
        let balanceInNumber = Number(balance);

        if (!balanceInNumber) {
            logger.error('[transferDwollaBalanceToBank] Balance is not a number');
            job.fail('[transferDwollaBalanceToBank] Balance is not a number');
            return done();
        }

        const initialDwollaBalance = Metrics.findOne({ _id: 'dwollaBalance' });

        if (initialDwollaBalance?.initialBalance) {
            balanceInNumber -= initialDwollaBalance.initialBalance.balance;
        }

        const result = await transferToBank({ amount: balanceInNumber }) as unknown[];

        if (!result.length) {
            logger.error('[transferDwollaBalanceToBank] Nothing returned');
            job.fail('[transferDwollaBalanceToBank] Nothing returned');
            return done();
        }

        await sendMessageToDwollaBot(balanceInNumber);
        done();

    } catch (error: unknown) {
        job.fail(error as string);
        Sentry.captureException(error);
        logger.error(`agenda.jobs.transferDwollaBalanceToBank: ${error as string}`);
        done();
    }
}