import moment from 'moment';
import { API } from '../api';
import Deals from '../../collections/deals';
import * as Sentry from '@sentry/node';
import logger from '../../../server/logger/log';
API.get('/api/metrics/today/deals', (req, res) => {
  try {
    const start = moment.tz(new Date(), 'America/New_York').startOf('D');

    const _query = {
      $and: [{ status: { $in: ['active', 'approved'] } }, { createdAt: { $gte: new Date(start) } }]
    };

    const _dealsCount = Deals.find(_query).count();

    res.status(200).send(
      JSON.stringify({
        status: 'success',
        cash_advances_count: _dealsCount
      })
    );
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`Error in /api/metrics/today/deals: ${error}`);
    return res.status(500).send('FAIL');
  }
});
