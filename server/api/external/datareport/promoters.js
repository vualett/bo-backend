import rateLimit from 'express-rate-limit';
import { Meteor } from 'meteor/meteor';
import { API } from '../../api';
import logger from '../../../logger/log';
import IPWhiteListCheck from '../../middlewares/IPWhiteListCheck';
import tokenCheck from '../../middlewares/tokenCheck';
import * as Sentry from '@sentry/node';
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minutes
  max: 100 // limit each IP to 10 requests per windowMs
});

API.get('/datareport/promoters', [limiter, IPWhiteListCheck, tokenCheck], async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const promoters = Meteor.users
      .find(
        { isPromoter: { $exists: true } },
        {
          fields: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            isPromoter: 1,
            isSubPromoter: 1,
            promoterType: 1
          }
        }
      )
      .fetch();

    return res.status(200).send(
      JSON.stringify({
        status: 'success',
        data: promoters
      })
    );
  } catch (error) {
    logger.error(`Error in /datareport/promoters: ${error}`);
    Sentry.captureException(error);
    return res.status(500).send('FAIL');
  }
});
