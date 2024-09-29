import express from 'express';
import logger from '../../../logger/log';
import { verifyGatewaySignature } from '../../../utils/utils';
import processWebhooks from './processWebhooks';
import { API } from '../../api';
import { DWOLLA_WEBHOOK_SECRET } from '../../../keys';

API.post('/webhooks/dwolla', express.json(), (req, res) => {
  const { body, headers } = req;

  const verify = verifyGatewaySignature(
    headers['x-request-signature-sha-256'],
    DWOLLA_WEBHOOK_SECRET,
    JSON.stringify(body)
  );

  if (verify) {
    processWebhooks(body);
  } else {
    logger.error('DWOLLA: webhook failed verify');
  }

  res.status(200).send();
});
