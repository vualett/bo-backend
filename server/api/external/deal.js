import { API } from '../api';
import logger from '../../logger/log';
import Deals from '../../collections/deals';
import rateLimit from 'express-rate-limit';
import IPWhiteListCheck from '../middlewares/IPWhiteListCheck';
import startOfDay from 'date-fns/startOfDay';
import endOfDay from 'date-fns/endOfDay';
import subDays from 'date-fns/subDays';
import startOfWeek from 'date-fns/startOfWeek';
import subWeeks from 'date-fns/subWeeks';
import startOfMonth from 'date-fns/startOfMonth';
import subMonths from 'date-fns/subMonths';
import endOfMonth from 'date-fns/endOfMonth';
import endOfWeek from 'date-fns/endOfWeek';
import utcToZonedTime from 'date-fns-tz/utcToZonedTime';
import * as Sentry from '@sentry/node';
const limiter = rateLimit({
  windowMs: 1000,
  max: 1
});

API.get('/external/deal/:_id', limiter, IPWhiteListCheck, async (req, res) => {
  try {
    const { _id } = req.params;

    const result = Deals.findOne(
      { _id },
      {
        fields: {
          amount: 1,
          fee: 1,
          feeAmount: 1,
          numberOfPayments: 1,
          userId: 1,
          status: 1,
          createdAt: 1,
          metrics: 1,
          approvedAt: 1,
          activateAt: 1,
          overdueSince: 1,
          toCollection: 1,
          'payments.number': 1,
          'payments.status': 1,
          'payments.date': 1,
          'payments.amount': 1,
          'payments.returnCode': 1,
          'payments.declinedAt': 1,
          'customer.firstName': 1,
          'customer.lastName': 1
        }
      }
    );

    return res.status(200).json(result);
  } catch (error) {
    logger.error('API::external/deal/:_id', error);
    res.status(500).send('Something went wrong');
    Sentry.captureException(error);
  }
});

API.get('/external/dealCount/:range', IPWhiteListCheck, async (req, res) => {
  try {
    const { range } = req.params;
    const { startDate, endDate, timezone } = req.headers;

    if (!(range && timezone) && !(startDate && endDate)) {
      res.status(500).send('Send range or dates');
    }

    let _startDate;
    let _endDate;

    switch (range) {
      case 'today':
        _startDate = utcToZonedTime(startOfDay(new Date()), timezone);
        _endDate = utcToZonedTime(endOfDay(new Date()), timezone);
        break;
      case 'yesterday':
        _startDate = utcToZonedTime(startOfDay(subDays(new Date(), 1)), timezone);
        _endDate = utcToZonedTime(endOfDay(subDays(new Date(), 1)), timezone);
        break;
      case 'thisWeek':
        _startDate = utcToZonedTime(startOfWeek(new Date()), timezone);
        _endDate = utcToZonedTime(endOfDay(new Date()), timezone);
        break;
      case 'lastWeek':
        _startDate = utcToZonedTime(startOfWeek(subWeeks(new Date(), 1)), timezone);
        _endDate = utcToZonedTime(endOfWeek(subWeeks(new Date(), 1)), timezone);
        break;
      case 'thisMonth':
        _startDate = utcToZonedTime(startOfMonth(new Date()), timezone);
        _endDate = utcToZonedTime(endOfMonth(new Date()), timezone);
        break;
      case 'lastMonth':
        _startDate = utcToZonedTime(startOfMonth(subMonths(new Date(), 1)), timezone);
        _endDate = utcToZonedTime(endOfMonth(subMonths(new Date(), 1)), timezone);
        break;
      default:
        _startDate = startDate;
        _endDate = endDate;
        break;
    }

    const result = Deals.find({
      createdAt: {
        $gt: _startDate,
        $lte: _endDate
      }
    }).count();

    return res.status(200).json(result);
  } catch (error) {
    logger.error('API::external/dealCount/:range', error);
    res.status(500).send('Something went wrong');
  }
});
