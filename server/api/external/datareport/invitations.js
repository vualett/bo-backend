import { header, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import MongoPaging from 'mongo-cursor-pagination';
import Invitations from '../../../collections/invitations';
import { API } from '../../api';
import IPWhiteListCheck from '../../middlewares/IPWhiteListCheck';
import tokenCheck from '../../middlewares/tokenCheck';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1min
  max: 200 // limit each IP to 200 requests per windowMs
});

API.get(
  '/datareport/invitations',
  [limiter, IPWhiteListCheck, tokenCheck, header('startdate').exists(), header('enddate').exists()],
  async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    const { startdate, enddate, next, previous } = req.headers;

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }

      const query = {
        when: { $gte: new Date(startdate), $lt: new Date(enddate) }
      };

      const results = await MongoPaging.find(Invitations.rawCollection(), {
        query,
        limit: 200,
        next,
        previous
      });

      return res.status(200).send(
        JSON.stringify({
          status: 'success',
          range: {
            start: query.when.$gte.toString(),
            end: query.when.$lt.toString()
          },
          count: results.results.length,
          previous: results.previous,
          hasPrevious: results.hasPrevious,
          next: results.next,
          hasNext: results.hasNext,
          results: results.results
        })
      );
    } catch (error) {
      logger.error(`Error in /datareport/invitations: ${error.message}`);
      Sentry.captureException(error);
      return res.status(500).send('FAIL');
    }
  }
);
