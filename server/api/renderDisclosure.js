/* eslint-disable @typescript-eslint/no-misused-promises */
import { API } from './api';
import fetch from 'node-fetch';
import * as Sentry from '@sentry/node';
import { SERVICES_AGREEMENT_PROCESSOR } from '../keys';
API.get('/render-document/:documentName', async (req, res) => {
  try {
    const url = `${SERVICES_AGREEMENT_PROCESSOR}/disclosure/render/web?${new URLSearchParams(req.query).toString()}`;

    const response = await fetch(url);

    const responseText = await response.text();

    res.status(response.status).send(responseText);
  } catch (error) {
    Sentry.captureException(error);
    res.status(401).send('Bad request');
  }
});
