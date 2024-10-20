/* eslint-disable @typescript-eslint/no-explicit-any */

import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import Security from '../../../server/utils/security';
import logger from '../../logger/log';
import { check } from 'meteor/check';
import * as Sentry from '@sentry/node';
import { differenceInDays, startOfDay, endOfDay, subDays } from 'date-fns';

export async function paymentsForAccouting(startDate: Date, endDate: Date): Promise<any> {
  try {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Error('User is not logged in');
    }

    Security.checkIfAdmin(userId);

    check(startDate, Date);
    check(endDate, Date);

    const dateDifferenceCurrentDay = differenceInDays(endDate, startDate);

    let adjustedStartDate = startDate;
    let adjustedEndDate = endDate;

    if (dateDifferenceCurrentDay === 0) {
      adjustedStartDate = startOfDay(startDate);
      adjustedEndDate = endOfDay(startDate);
    }

    const startDateLastWeek = startOfDay(subDays(adjustedStartDate, 7));
    const endDateLastWeek = endOfDay(subDays(adjustedEndDate, 7));
    const dateDifference = differenceInDays(endDate, startDate);

    const paymentsCollection = Deals.rawCollection();

    const processPayments = async (dateRange: { $gte: Date; $lte: Date }) => {
      const pipeline = [
        {
          $match: {
            'payments.paidAt': { $exists: true },
            payments: { $elemMatch: { paidAt: dateRange } }
          }
        },
        {
          $project: {
            payments: {
              $filter: {
                input: '$payments',
                as: 'payment',
                cond: {
                  $and: [{ $gte: ['$$payment.paidAt', dateRange.$gte] }, { $lte: ['$$payment.paidAt', dateRange.$lte] }]
                }
              }
            }
          }
        },
        {
          $unwind: '$payments'
        },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalPrincipal: { $sum: '$payments.principal' },
            totalAmount: { $sum: '$payments.amount' },
            totalFee: { $sum: '$payments.fee' }
          }
        }
      ];
      const results = await paymentsCollection.aggregate(pipeline).toArray();

      if (results.length === 0) {
        return {
          payments: 0,
          principal: 0,
          amount: 0,
          fee: 0
        };
      } else {
        return {
          payments: results[0].totalPayments,
          principal: results[0].totalPrincipal,
          amount: results[0].totalAmount,
          fee: results[0].totalFee
        };
      }
    };

    const currentWeekData = await processPayments({
      $gte: startDate,
      $lte: endDate
    });

    let lastWeekData = {};

    if (dateDifference === 0) {
      lastWeekData = await processPayments({
        $gte: startDateLastWeek,
        $lte: endDateLastWeek
      });
    }

    return {
      currentWeek: currentWeekData,
      lastWeek: dateDifference === 0 ? lastWeekData : {}
    };
  } catch (error: unknown) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`Payments for accounting: ${message}`);
  }
}

Meteor.methods({ 'accounting.Payments': paymentsForAccouting });
