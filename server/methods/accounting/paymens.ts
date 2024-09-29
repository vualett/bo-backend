import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import Security from '/server/utils/security';
import logger from '../../logger/log';
import { check } from 'meteor/check';
import * as Sentry from '@sentry/node';
export async function paymentsForAccouting(startDate: Date, endDate: Date) {
  try {
    Security.checkIfAdmin(this.userId);
    check(startDate, Date);
    check(endDate, Date);

    const payments = Deals.rawCollection()
      .aggregate([
        {
          $unwind: {
            path: '$payments'
          }
        },
        {
          $match: {
            'payments.paidAt': {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: 0,
            payments: {
              $sum: 1
            },
            principal: {
              $sum: '$payments.principal'
            },
            amount: {
              $sum: '$payments.amount'
            },
            fee: {
              $sum: '$payments.fee'
            }
          }
        }
      ])
      .toArray();

    return await payments;
  } catch (error: unknown) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`Paymens fot accouting:${message}`);
  }
}
Meteor.methods({ 'accounting.Payments': paymentsForAccouting });
