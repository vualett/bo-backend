import express from 'express';
import rateLimit from 'express-rate-limit';
import { API } from '../api';
import Deals from '../../collections/deals';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import { API_SECRETS_GET_INFO } from '../../keys';
const limiter = rateLimit({
  windowMs: 1000, // 1 sec
  max: 10 // limit each IP to 5 requests per windowMs
});

API.get('/getinfo/cashadvance/:id', express.urlencoded({ extended: false }), limiter, async (req, res) => {
  const { secret } = req.headers;
  const { id } = req.params;

  try {
    if (secret !== API_SECRETS_GET_INFO) {
      return res.status(401).send('NOT-AUTHORIZED');
    }

    const fields = {
      _id: false,
      status: true,
      userId: true,
      amount: true,
      fee: true,
      numberOfPayments: true,
      'payments.status': true,
      'payments.number': true,
      'payments.date': true,
      'payments.originalDate': true,
      'payments.amount': true,
      'payments.initiatedAt': true,
      'payments.transferUrl': true,
      'payments.bonus': true,
      'payments.directDeposit': true,
      createdAt: true,
      approvedAt: true,
      transferUrl: true
    };

    const deal = await Deals.findOne({ _id: id }, { fields });
    if (!deal) return res.status(401).send('NOT_FOUND');

    const result = {
      ...deal,
      transferID: deal.transferUrl.split('/').pop(),
      payments:
        deal.payments.length > 0
          ? deal.payments.map(({ transferUrl, ...rest }) => ({
              ...rest,
              transferID: transferUrl ? transferUrl.split('/').pop() : false,
              dwolla: rest.initiatedAt ? new Date(rest.initiatedAt) >= new Date('2020-01-16') : null
            }))
          : [],
      transferUrl: null
    };

    return res.status(200).send(result);
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`[API:/getinfo/cashadvance/][${id}]${error}`);
    return res.status(500).send('FAIL');
  }
});
