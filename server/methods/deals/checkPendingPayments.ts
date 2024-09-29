/* eslint-disable import/no-absolute-path */
import { Meteor } from 'meteor/meteor';

import Deals from '../../collections/deals';

import { asyncForEach } from '../../utils/utils';
import checkIfPaymentProcessed from './checkIfPaymentProcessed';
import * as Sentry from '@sentry/node';
import { sendNotification } from '../../bot/sendNotification';

import subBusinessDays from 'date-fns/subBusinessDays';
import logger from '../../logger/log';
export async function checkPendingPayments(): Promise<{ result: number } | undefined> {
  try {
    const sub4Days = subBusinessDays(new Date(), 4);
    const sub6Days = subBusinessDays(new Date(), 6);
    let paymentProcessedCount = 0;
    const result = (await Deals.rawCollection()
      .aggregate([
        {
          $match: {
            status: 'active'
          }
        },
        {
          $unwind: {
            path: '$payments'
          }
        },
        {
          $match: {
            'payments.status': 'pending',
            'payments.initiatedAt': {
              $lte: sub4Days
            }
          }
        },
        {
          $project: {
            _id: 0,

            initiatedAt: '$payments.initiatedAt',
            dealId: '$_id',
            paymentNumber: '$payments.number'
          }
        }
      ])
      .toArray()) as unknown as Array<{
      initiatedAt: Date;
      dealId: string;
      paymentNumber: number;
    }>;

    await asyncForEach(
      result,
      async ({ dealId, paymentNumber }: { initiatedAt: Date; dealId: string; paymentNumber: number }) => {
        const isPaymentProcessed = (await checkIfPaymentProcessed({
          dealID: dealId,
          paymentNumber
        })) as boolean;

        if (isPaymentProcessed) {
          paymentProcessedCount++;
        }
      }
    );
    const pending6DaysPayments = await Deals.rawCollection()
      .aggregate([
        {
          $match: {
            status: 'active'
          }
        },
        {
          $unwind: {
            path: '$payments'
          }
        },
        {
          $match: {
            'payments.status': 'pending',
            'payments.initiatedAt': {
              $lte: sub6Days
            }
          }
        },
        {
          $project: {
            _id: 0,

            initiatedAt: '$payments.initiatedAt',
            dealId: '$_id',
            paymentNumber: '$payments.number'
          }
        }
      ])
      .toArray();
    await sendNotification(`${paymentProcessedCount} payment process from 4 days ago`);
    await sendNotification(`${result.length - paymentProcessedCount} pending payment from 4 days ago`);
    await sendNotification(`${pending6DaysPayments.length} payment pending for  process from 6 days ago`);

    return { result: result?.length };
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`deals.checkPendingPaymentsHave4Days:${error as string}`);
  }
}
Meteor.methods({
  'deals.checkPendingPaymentsHave4Days': checkPendingPayments
});
