// create agenda job to get initial dwolla balance an store it in a document called "dwollaBalance", in metrics Collection, this job run every day at 7am.

import { Meteor } from 'meteor/meteor';
import { Agenda, Job } from '@hokify/agenda';
import { startOfDay, addDays } from 'date-fns';
import Deals from '../../collections/deals';
import { sendNotification } from '../../bot/sendNotification';

import { queueInitiatePayment } from '../../queue/queue';

const JobName = 'todaysPaymentsBatchSameDayACHJob';

interface IPaymentToInitiate {
    userId: string;
    dealId: string;
    payment: {
        number: number;
        idempotencyKey: string;
        amount: number;
        skip: boolean;
    }
}

export default async function todaysPaymentsBatchSameDayACHJob(agenda: Agenda, cron: string): Promise<void> {
    agenda.define(JobName, async (job: Job, done: () => void) => {
        try {
            const dates = {
                start: startOfDay(new Date()),
                end: addDays(startOfDay(new Date()), 1)
            };

            const pipeline = [
                {
                    $match: {
                        status: 'active',
                        debitChannel: 'SAME_DAY_ACH',
                        'payments.date': { $gte: dates.start, $lt: dates.end }
                    }
                },
                { $unwind: '$payments' },
                {
                    $project: {
                        _id: 0,
                        dealId: '$_id',
                        userId: 1,
                        payment: '$payments'
                    }
                },
                {
                    $match: {
                        'payment.status': 'schedule',
                        'payment.date': { $gte: dates.start, $lt: dates.end }
                    }
                }
            ];

            async function checkIfGoodStandingToInitPayment(dealID: string): Promise<boolean> {
                const deal = await Deals.findOneAsync({ _id: dealID });
                if (deal) {
                    const badPayments = deal.payments.filter((p) => p.status === 'declined');
                    if (badPayments.length > 3) return false;
                }
                return true;
            }

            const payments = await Deals.rawCollection().aggregate(pipeline).toArray();

            let notToInitiate = 0;
            let skipped = 0;

            for (const p of payments as IPaymentToInitiate[]) {
                if (!p.payment.skip) {
                    if (await checkIfGoodStandingToInitPayment(p.dealId)) {
                        await queueInitiatePayment({
                            userId: p.userId,
                            dealId: p.dealId,
                            paymentNumber: p.payment.number,
                            idempotencyKey: p.payment.idempotencyKey,
                            amount: p.payment.amount
                        });
                    } else {
                        notToInitiate += 1;
                    }
                } else {
                    skipped += 1;
                }
            }

            done();

            await sendNotification(
                `*PAYMENTS (Same Day ACH) *
            TO INITIATE:  \`${payments.length - notToInitiate}\`
            NOT INITIATE: \`${notToInitiate + skipped}\` `
            );


        } catch (error: unknown) {
            const { message } = error as Meteor.Error;
            job.fail(message);
            done();
        }
    });

    await agenda.every(cron, JobName);
}