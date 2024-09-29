import { header, validationResult } from 'express-validator';
import { API } from './api';
import Logs from '../collections/logs';
import * as Sentry from '@sentry/node';
import logger from '../logger/log';
import { EXPORT_METHOD_SECRET } from '../keys';
API.post(
  '/insert_note_to_user',
  [header('token').exists(), header('agent').exists(), header('note').exists(), header('customerid').exists()],
  async (req, res) => {
    const { headers } = req;
    const { token, agent, userid, note, customerid } = headers;

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }

      if (EXPORT_METHOD_SECRET !== token) {
        res.status(401).send(JSON.stringify({ status: 'error', error: 'not-authorized' }));
      }
      const log = {
        type: 'generic',
        userId: customerid,
        who: {
          name: 'Ualett',
          id: 'EXTERNAL_APP',
          agent,
          external_app_userid: userid || false
        },
        message: note,
        timestamp: new Date()
      };

      Logs.insert(log);
      return res.status(200).send('OK');
    } catch (error) {
      Sentry.captureException(error);
      logger.error('API::insert_note_to_user', error);
      return res.status(500).send('FAIL');
    }
  }
);
