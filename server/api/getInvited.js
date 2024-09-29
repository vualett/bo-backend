import express from 'express';
import { API } from './api';
import createInvitation from '../methods/invitations/createInvitation';
import * as Sentry from '@sentry/node';
import logger from '../logger/log';
import { API_SECRETS_GET_INVITED } from '../keys';

API.post('/getinvited', express.json(), async (req, res) => {
  const { body, headers } = req;
  const { secret } = headers;
  const { phone, name, origin, state, by } = body;

  try {
    if (secret !== API_SECRETS_GET_INVITED) {
      return res.status(401).send('NOT-AUTHORIZED');
    }

    const results = await createInvitation({
      phone,
      metadata: { name, origin, state, source: !by ? 'N/A' : 'FRIEND' },
      by: !by ? 'virtual-assistant' : by
    });

    if (!results) return res.status(400).send('UNABLE_TO_CREATE_THE_INVITATION');

    return res.status(200).send('OK');
  } catch (error) {
    if (error.error === 'USER ALREADY INVITED') return res.status(400).send('INVITED');

    Sentry.captureException(error);
    logger.error('API::getInvited', error);
    return res.status(500).send('FAIL');
  }
});
