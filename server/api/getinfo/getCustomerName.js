import { Meteor } from 'meteor/meteor';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { API } from '../api';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import { API_SECRETS_GET_INFO } from '../../keys';
const limiter = rateLimit({
  windowMs: 1000, // 1 sec
  max: 5 // limit each IP to 5 requests per windowMs
});

API.get('/getinfo/customer/:id/name', express.urlencoded({ extended: false }), limiter, async (req, res) => {
  const { secret } = req.headers;
  const { id } = req.params;

  try {
    if (secret !== API_SECRETS_GET_INFO) {
      return res.status(401).send('NOT-AUTHORIZED');
    }

    const fields = {
      _id: false,
      firstName: true,
      lastName: true
    };

    const customer = await Meteor.users.findOne({ _id: id }, { fields });
    if (!customer) return res.status(401).send('NOT_FOUND');

    return res.status(200).send(customer);
  } catch (error) {
    logger.error(`[API:/getinfo/customer/:id/name][${id}]${error}`);
    Sentry.captureException(error);
    return res.status(500).send('FAIL');
  }
});
