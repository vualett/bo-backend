import { startOfDay, subDays, endOfDay } from 'date-fns';
import { Meteor } from 'meteor/meteor';
import { zonedTimeToUtc } from 'date-fns-tz';
import { API } from '../api';
import Deals from '../../collections/deals';
import IPWhiteListCheck from '../middlewares/IPWhiteListCheck';
import * as Sentry from '@sentry/node';
import logger from '../../../server/logger/log';
const _timezone = 'America/New_York';

API.get('/external/cashAdvances/overdue', IPWhiteListCheck, async (req, res) => {
  try {
    const { startdate, enddate } = req.headers;

    const _startDate = startdate
      ? zonedTimeToUtc(startOfDay(new Date(startdate)), _timezone)
      : subDays(startOfDay(new Date()), 1);

    const _finalDate = enddate ? zonedTimeToUtc(endOfDay(new Date(enddate)), _timezone) : endOfDay(new Date());

    const pipeline = [
      {
        $match: {
          overdueSince: {
            $gte: _startDate,
            $lte: _finalDate
          }
        }
      },
      {
        $lookup: {
          from: Meteor.users._name,
          localField: 'userId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $project: {
          amount: 1,
          overdueSince: 1,
          userId: 1,
          status: 1,
          toCollection: 1,
          'payments.number': 1,
          'payments.status': 1,
          'payments.date': 1,
          'payments.amount': 1,
          'payments.returnCode': 1,
          'payments.declinedAt': 1,
          createdAt: 1,
          approvedAt: 1,
          activateAt: 1,
          'customer.firstName': 1,
          'customer.lastName': 1,
          'customer.phone': 1,
          'customer.emails': 1,
          'customer.language': 1
        }
      }
    ];

    const CAs = await Deals.rawCollection().aggregate(pipeline).toArray();

    return res.status(200).send({ cashAdvancesInOverdue: CAs });
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`Error in /external/cashAdvances/overdue: ${error}`);
    return res.status(500).send('FAIL');
  }
});
