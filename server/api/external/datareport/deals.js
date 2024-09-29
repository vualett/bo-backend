import MongoPaging from 'mongo-cursor-pagination';
import rateLimit from 'express-rate-limit';
import { API } from '../../api';
import Deals from '../../../collections/deals';
import { dealTransform } from '../docTransform';
import getDateRange from '../getDateRange';
import { isJsonString, stringValueToObject } from '../../../utils/utils';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';
import { EXPORT_METHOD_SECRET } from '../../../keys';

function omit(obj, ...props) {
  const result = { ...obj };
  props.forEach(function (prop) {
    delete result[prop];
  });
  return result;
}
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minutes
  max: 100 // limit each IP to 10 requests per windowMs
});

const DealsCollection = Deals.rawCollection();

API.get('/datareport/deals', limiter, async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { token, firstdate, lastdate, filter, dealdateoperator, status, next, previous } = req.headers;

  try {
    let query = { status: { $nin: ['cancelled'] } };

    const { startDate, endDate } = getDateRange({
      start: firstdate,
      end: lastdate
    });

    if (dealdateoperator) {
      query[dealdateoperator] = { $gte: startDate, $lt: endDate };
    } else {
      query.approvedAt = { $gte: startDate, $lt: endDate };
    }

    if (['requested', 'approved', 'active', 'cancelled', 'completed', 'closed'].includes(status)) {
      query.status = status;
    }

    if (status === 'completed') {
      query = {
        status: 'completed',
        completeAt: { $gte: startDate, $lt: endDate }
      };
    }

    const toOmit = ['fee', 'product_name', 'idempotencyKey', 'termsOfPayment', 'lock', 'modifiedAt', 'preApprovedAt'];

    if (filter) {
      toOmit.push('payments');
      toOmit.push('numberOfPayments');
    }

    if (EXPORT_METHOD_SECRET !== token) {
      res.status(401).send(
        JSON.stringify({
          status: 'error',
          error: 'not-authorized'
        })
      );
    }

    const results = await MongoPaging.find(DealsCollection, {
      query,
      limit: 500,
      next,
      previous
    });

    results.results = results.results.map((doc) => dealTransform(omit(doc, ...toOmit)));

    res.status(200).send(
      JSON.stringify({
        status: 'success',
        range: { start: startDate, end: lastdate },
        previous: results.previous,
        hasPrevious: results.hasPrevious,
        next: results.next,
        hasNext: results.hasNext,
        results: results.results
      })
    );
  } catch (error) {
    logger.error(`[API/datareport/deals]${error}`);
    res.status(400).send({ status: 'fail', message: '' });
  }
});

/**
 * GET HTTP REQUEST https://api.ualett.com/datareport/dealsQuery
 * Get deals paginated with querie details specified
 *
 * @param {Object} req.headers
 *    -token {String} Secret token for HTTP authentication.
 *    -next {String} The value to start querying the page.
 *    -previos {String} The value to start querying previous page.
 *    -firstdate {String} Date from which to query the date operator.
 *    -lastdate {String} Date end till which to query the date operator.
 *    -dealdateoperator {String} The field to apply the date range to.
 * @param {Object} req.query
 *    -queries {String} String to parse into object to get collection.find() query.
 *    -limit {Number} The page size. Must be between 1 and `config.MAX_LIMIT`.
 *    -fields {String} String to parse into object. Fields to query in the Mongo object format, e.g. {_id: 1, timestamp :1}. Default will come _id and userId
 */
API.get('/datareport/dealsQuery', limiter, async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { token, next, previous, firstdate, lastdate, dealdateoperator } = req.headers;

    const { queries, limit, fields } = req.query;

    // Query parser
    const parsedQueries = isJsonString(queries) ? JSON.parse(queries) : {};
    let _queries = {};

    for (var [key, value] of Object.entries(parsedQueries)) {
      if (!!Date.parse(value)) {
        _queries[key] = new Date(value);
      } else {
        _queries[key] = value;
      }
    }

    if (!!Date.parse(firstdate) && !!Date.parse(lastdate)) {
      const { startDate, endDate } = getDateRange({
        start: firstdate,
        end: lastdate
      });

      if (dealdateoperator) {
        _queries[dealdateoperator] = { $gte: startDate, $lt: endDate };
      } else {
        _queries.approvedAt = { $gte: startDate, $lt: endDate };
      }
    }

    // Limit parser
    const _limit = !isNaN(limit) ? Number(limit) : null;

    // Fields parser
    const toOmit = ['fee', 'product_name', 'idempotencyKey', 'termsOfPayment', 'lock', 'modifiedAt', 'preApprovedAt'];

    const _fields = !!fields
      ? fields
          .split(',')
          .map((e) => stringValueToObject(e))
          .filter((e) => !toOmit.includes(Object.keys(e)[0]))
          .reduce((accumulator, currentValue) => (accumulator = { ...accumulator, ...currentValue }), {})
      : {};

    if (EXPORT_METHOD_SECRET !== token) {
      res.status(401).send(
        JSON.stringify({
          status: 'error',
          error: 'not-authorized'
        })
      );
    }

    const results = await MongoPaging.find(DealsCollection, {
      query: _queries,
      limit: _limit || 500,
      next,
      previous
    });

    if (_fields?.customer) {
      results.results = results.results.map((doc) => {
        let obj = { _id: doc._id, userId: doc.userId };
        Object.keys(_fields).forEach((e) => {
          obj[e] = doc[e];
        });
        return dealTransform(obj);
      });
    } else {
      results.results = results.results.map((doc) => {
        let obj = { _id: doc._id, userId: doc.userId };
        Object.keys(_fields).forEach((e) => {
          obj[e] = doc[e];
        });
        return obj;
      });
    }

    res.status(200).send(
      JSON.stringify({
        status: 'success',
        range: { start: firstdate, end: lastdate },
        validRange: !!Date.parse(firstdate) && !!Date.parse(lastdate),
        previous: results.previous,
        hasPrevious: results.hasPrevious,
        next: results.next,
        hasNext: results.hasNext,
        results: results.results
      })
    );
  } catch (error) {
    logger.error(`[API:/datareport/dealsQuery] ${error}`);
    Sentry.captureException(error);
    res.status(400).send({ status: 'fail', message: 'Internal Server Error' });
  }
});
