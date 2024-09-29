import { Meteor } from 'meteor/meteor';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { API } from '../../../api/api';
import Invitations from '../../../collections/invitations';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';
import { API_SECRETS_GET_INFO } from '../../../keys';
const limiter = rateLimit({
  windowMs: 1000, // 1 sec
  max: 10 // limit each IP to 5 requests per windowMs
});

API.post(
  '/invitations/set/:invitationID',
  express.json(),
  limiter,
  Meteor.bindEnvironment((req, res) => {
    try {
      const { secret } = req.headers;
      const { invitationID } = req.params;
      const { status } = req.body;

      if (secret !== API_SECRETS_GET_INFO) {
        return res.status(401).send('NOT-AUTHORIZED');
      }

      if (!['invalid', 'valid', 'pending'].includes(status)) throw new Error('bad status value');

      const set = { status };

      if (status === 'invalid') {
        set.invalid = true;
        set.invalidDate = new Date();
      }

      if (status === 'valid') {
        set.invalid = false;
      }

      const invitation = Invitations.update({ _id: invitationID }, { $set: set });

      if (!invitation) throw new Error('Invitation not found');

      return res.status(200).send('OK');
    } catch (error) {
      logger.error(`[API:/invitations/set/:invitationID] ${error}`);
      Sentry.captureException(error);
      return res.status(500).send('FAIL');
    }
  })
);
