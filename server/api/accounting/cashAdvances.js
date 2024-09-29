import MongoPaging from 'mongo-cursor-pagination';
import { parse } from 'date-fns';
import Deals from '../../collections/deals';
import { API } from '../api';
import { dealTransform } from './docTranforms';
import logger from '../../logger/log';
import getDateRange from '../external/getDateRange';
import * as Sentry from '@sentry/node';
const DealsCollection = Deals.rawCollection();
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
      $and: [
        { status: { $in: ['active', 'suspended', 'completed'] } },
        { activateAt: { $gte: dates.start, $lt: dates.end } }
      ]
    }
  };
}

API.get('/api/accounting/cashadvances', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { dates, query } = gettingQuery(req);

    const results = await MongoPaging.find(DealsCollection, {
      query,
      limit: LIMIT,
      next: req.query.next,
      previous: req.query.previous
    });
    results.results = results.results.map((doc) => dealTransform(doc, { payments: false, customer: false }));

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
    logger.error(`[API:/api/accounting/cashadvances]${error}`);
    Sentry.captureException(error);
    res.status(400).send({ status: 'fail', message: '' });
  }
});
