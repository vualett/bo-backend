import { Meteor } from 'meteor/meteor';
import MongoPaging from 'mongo-cursor-pagination';
import rateLimit from 'express-rate-limit';
import { API } from '../../api';
import getDateRange from '../getDateRange';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';
import { EXPORT_METHOD_SECRET } from '../../../keys';
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minutes
  max: 100 // limit each IP to 10 requests per windowMs
});

const CustomersCollection = Meteor.users.rawCollection();

API.get('/datareport/customers', limiter, async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const { token, firstdate, lastdate, next, previous } = req.headers;

  try {
    if (EXPORT_METHOD_SECRET !== token) {
      res.status(401).send(
        JSON.stringify({
          status: 'error',
          error: 'not-authorized'
        })
      );
    }
    const { startDate, endDate } = getDateRange({
      start: firstdate,
      end: lastdate
    });

    const query = {
      type: 'user',
      createdAt: { $gte: startDate, $lt: endDate }
    };

    const results = await MongoPaging.find(CustomersCollection, {
      query,
      limit: 200,
      next,
      previous
    });

    const resultsMapped = results.results.map((u) => {
      const {
        _id,
        firstName,
        lastName,
        emails,
        phone,
        address,
        business,
        createdAt,
        status,
        metrics,
        isPromoter,
        isSubPromoter,
        promoterType,
        currentCashAdvance,
        invitedBy,
        verifiedDate,
        lastCall,
        bankAccount,
        category,
        hasFunding,
        hasDriverLicense,
        promoCode
      } = u;

      return {
        _id,
        firstName,
        lastName,
        phone,
        address,
        business,
        createdAt,
        status,
        metrics,
        isPromoter,
        isSubPromoter,
        promoterType,
        currentCashAdvance,
        invitedBy,
        verifiedDate,
        lastCall,
        emails,
        bankAccount: bankAccount ? { bankName: bankAccount.bankName, channels: bankAccount.channels } : null,
        category,
        hasFunding,
        hasDriverLicense,
        promoCode
      };
    });

    res.status(200).send(
      JSON.stringify({
        status: 'success',
        range: { start: startDate.toString(), end: endDate.toString() },
        count: results.results.length,
        previous: results.previous,
        hasPrevious: results.hasPrevious,
        next: results.next,
        hasNext: results.hasNext,
        results: resultsMapped
      })
    );
  } catch (error) {
    logger.error(`[API:datareport/customers] ${error}`);
    Sentry.captureException(error);
    res.status(400).send({ status: 'fail', message: '' });
  }
});
