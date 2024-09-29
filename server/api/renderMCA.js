import logger from '../logger/log';
import { API } from './api';
import * as Sentry from '@sentry/node';
import { fetch } from 'meteor/fetch';
import { SERVICES_AGREEMENT_PROCESSOR } from '../keys';

API.get('/render-mca', async (req, res) => {
  try {
    const params = {
      ...req.query,
      subvalidAmountSoldPurchasePrice: `${req.query.validAmountSold - req.query.amount}`
    };

    const url = `${SERVICES_AGREEMENT_PROCESSOR}/mca/render/web?${new URLSearchParams(params).toString()}`;

    let response = await fetch(url);
    response = await response.text();
    res.send(response);
  } catch (error) {
    Sentry.captureException(error);
    logger.error('API::render-mca', error);
    res.status(500).send('Bad request');
  }
});
