/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable  @typescript-eslint/no-misused-promises */
import { API } from '../../api';
import express from 'express';
import crypto, { BinaryLike } from 'crypto';
import logger from '../../../logger/log';
import addArgyleAccount from '../../../methods/argyle/argyleMethods/addArgyleAccount';
import removeArgyleAccount from '../../../methods/argyle/argyleMethods/removeArgyleAccount';
import updateArgyleAccount from '../../../methods/argyle/argyleMethods/updateArgyleAccount';
import { ARGYLE_WEBHOOK_SECRET } from '../../../keys';

interface BodyArgyle {
  event: string;
  name: string;
  data: {
    account: string;
    user: string;
    payroll_document: string;
  };
}
export interface Account {
  id: string;
  employers: string[];
  source: string;
  created_at: Date;
  updated_at: Date;
  scanned_at: Date;
  item: string;
  connection: Connection;
}

export interface Connection {
  status: string;
  error_code: null | string;
  error_message: null | string;
  updated_at: Date;
}

API.post(
  '/webhooks/argyle',
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  }),
  async (req, res): Promise<void> => {
    const signature = crypto
      .createHmac('sha512', ARGYLE_WEBHOOK_SECRET ?? '')
      .update(req.rawBody as BinaryLike)
      .digest('hex');

    if (signature !== req.headers['x-argyle-signature']) {
      logger.error('ARGYLE: wrong signature');
      res.status(401).send();
      return;
    }

    const { event, data } = req.body as BodyArgyle;

    if (event === 'accounts.connected') {
      await addArgyleAccount({
        userId: data.user,
        accountId: data.account
      });
    }

    if (event === 'accounts.updated') {
      await updateArgyleAccount({
        userId: data.user,
        accountId: data.account
      });
    }

    if (event === 'accounts.removed') {
      await removeArgyleAccount({
        userId: data.user,
        id: data.account
      });
    }


    res.status(200).send();
  }
);
