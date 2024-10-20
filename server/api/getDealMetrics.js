import express from 'express';
import { API } from './api';
import Deals from '../collections/deals';
import logger from '../logger/log';
import * as Sentry from '@sentry/node';
import { API_SECRETS_GET_INFO } from '../keys';
import { Meteor } from 'meteor/meteor';

// Endpoint para verificar rescheduledPayments o failedPayments en el último deal del usuario
API.get('/getinfo/customer/:phone', express.json(), async (req, res) => {
  const { secret } = req.headers;
  const { phone } = req.params;

  try {
    if (secret !== API_SECRETS_GET_INFO) {
      return res.status(401).send('NOT-AUTHORIZED');
    }

    const customer = await Meteor.users.findOne({ 'phone.number': phone }, { fields: { _id: true } });
    if (!customer) return res.status(404).send('USER_NOT_FOUND');

    const userId = customer._id;

    const lastDeal = await Deals.findOne(
      { userId },
      { sort: { createdAt: -1 }, fields: { metrics: true, status: true } }
    );
    if (!lastDeal) return res.status(404).send('NO_DEAL_FOUND');

    const { metrics } = lastDeal;

    let hasIssue;

    if (lastDeal.status === 'completed') {
      return res.status(200).send({ hasIssue: false });
    } else {
      hasIssue = !!(
        (metrics.batchReschedule && metrics.batchReschedule >= 1) ||
        (metrics.failedPayments && metrics.failedPayments >= 1)
      );
    }

    return res.status(200).send({ hasIssue });
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`[API:/getinfo/customer/:phone][${phone}]${error}`);
    return res.status(500).send('FAIL');
  }
});
