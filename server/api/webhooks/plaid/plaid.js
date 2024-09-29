/* eslint-disable camelcase */
import { Meteor } from 'meteor/meteor';
import express from 'express';
import assetsReportReady from './assetsReportReady';
import assetsReportError from './assetsReportError';
import { API } from '../../api';
import IDVStatusUpdated from './IDVStatusUpdated';

API.post(
  '/webhooks/plaid',
  express.json(),
  Meteor.bindEnvironment((req, res) => {
    const { body } = req;
    const { webhook_type, webhook_code, asset_report_id } = body;

    if (webhook_type === 'ASSETS') {
      if (webhook_code === 'PRODUCT_READY') assetsReportReady(asset_report_id);
      if (webhook_code === 'ERROR') {
        assetsReportError(asset_report_id, body.error);
      }
      return res.status(200).send();
    }

    if (webhook_type === 'IDENTITY_VERIFICATION') {
      IDVStatusUpdated(body);
      return res.status(200).send();
    }

    res.status(200).send();
  })
);
