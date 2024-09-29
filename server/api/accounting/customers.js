import { Meteor } from 'meteor/meteor';
import MongoPaging from 'mongo-cursor-pagination';
import { parse } from 'date-fns';
import { API } from '../api';
import getDateRange from '../external/getDateRange';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
const Users = Meteor.users.rawCollection();
const LIMIT = 500;

function gettingQuery(req) {
  const { range, firstdate, lastdate } = req.query;
  const dates = {
    start: new Date('2018/06/01'),
    end: new Date()
  };

  if (range || (firstdate && lastdate)) {
    const { startDate, endDate } =
      firstdate && lastdate
        ? getDateRange({
            start: parse(firstdate, 'YYYYMMDD'),
            end: parse(lastdate, 'YYYYMMDD')
          })
        : getDateRange(range);
    dates.start = startDate;
    dates.end = endDate;
  }

  return {
    dates,
    query: {
      createdAt: { $gte: dates.start, $lt: dates.end },
      $and: [{ 'status.verified': { $eq: true } }, { 'status.qualify': { $in: [true, null] } }]
    }
  };
}

API.get('/api/accounting/customers', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { dates, query } = gettingQuery(req);

    const pipeline = [
      { $match: query },
      {
        $project: {
          _id: 0,
          userID: '$_id',
          firstName: 1,
          lastName: 1,
          createdAt: 1,
          email: { $arrayElemAt: [{ $slice: ['$emails.address', -1] }, 0] }
        }
      }
    ];

    const results = await MongoPaging.aggregate(Users, {
      aggregation: pipeline,
      limit: LIMIT,
      next: req.query.next,
      previous: req.query.previous,
      paginatedField: 'createdAt'
    });
    // TODO: use a indexed field for paginatedField

    res.status(200).send(
      JSON.stringify({
        status: 'success',
        range: dates,
        previous: results.previous,
        hasPrevious: results.hasPrevious,
        next: results.next,
        hasNext: results.hasNext,
        results: results.results
      })
    );
  } catch (error) {
    logger.error(`[API:/api/accounting/customers] ${error}`);
    Sentry.captureException(error);
    res.status(400).send({ status: 'fail', message: '' });
  }
});
