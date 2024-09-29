import endOfDay from 'date-fns/endOfDay';
import startOfDay from 'date-fns/startOfDay';
import format from 'date-fns/format';
import Deals from '../../collections/deals';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Reports from '../../collections/reports';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
export async function getCashFlow({ startDate, endDate }) {
  try {
    const incomes = await Deals.rawCollection()
      .aggregate([
        {
          $match: {
            payments: {
              $elemMatch: {
                paidAt: {
                  $gt: startOfDay(startDate),
                  $lte: endOfDay(endDate)
                },
                status: 'paid'
              }
            }
          }
        },
        {
          $unwind: {
            path: '$payments'
          }
        },
        {
          $match: {
            'payments.status': 'paid',
            'payments.paidAt': {
              $gt: startOfDay(startDate),
              $lte: endOfDay(endDate)
            }
          }
        },
        {
          $group: {
            _id: null,
            amount: {
              $sum: '$payments.amount'
            },
            principal: {
              $sum: '$payments.principal'
            },
            fee: {
              $sum: '$payments.fee'
            }
          }
        }
      ])
      .toArray();

    const expenses = await Deals.rawCollection()
      .aggregate([
        {
          $match: {
            approvedAt: {
              $gt: startOfDay(startDate),
              $lte: endOfDay(endDate)
            }
          }
        },
        {
          $group: {
            _id: null,
            count: {
              $sum: '$amount'
            }
          }
        }
      ])
      .toArray();

    delete incomes[0]?._id;
    delete expenses[0]?._id;

    return {
      incomes: incomes[0],
      expenses: expenses[0]
    };
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`ualett.getCashFlow ${error}`);
  }
}

export async function generateDayCashFlowReport({ day }) {
  check(day, Date);
  try {
    const result = await getCashFlow({
      startDate: startOfDay(day),
      endDate: endOfDay(day)
    });

    if (result) {
      const reportID = Reports.upsert(
        { dateFormatted: format(day, 'd-MM-y') },
        {
          $set: {
            type: 'cashFlow',
            ready: true,
            created: day,
            report: result
          }
        }
      );
      return reportID;
    } else {
      throw new Error('Nothing returned');
    }
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`ualett.generateDayCashFlowReport ${error}`);
    throw error;
  }
}

Meteor.methods({
  'ualett.getCashFlow': getCashFlow,
  'ualett.generateDayCashFlowReport': generateDayCashFlowReport
});
