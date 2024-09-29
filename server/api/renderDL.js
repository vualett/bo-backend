import { Meteor } from 'meteor/meteor';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { API } from './api';
import { s3 } from '../aws/services';
import cors from 'cors';
import logger from '../logger/log';
import * as Sentry from '@sentry/node';
import { AWS_DL_BUCKET_NAME } from '../keys';

API.get(
  '/renderDL/:key',
  cors({
    origin: Meteor.isProduction ? 'https://backoffice.ualett.com' : 'http://localhost:3000'
  }),
  async (req, res) => {
    try {
      const { key } = req.params;

      if (key) {
        const params = {
          Bucket: AWS_DL_BUCKET_NAME,
          Key: key
        };

        const command = new GetObjectCommand(params);

        const response = await s3.send(command);

        response.Body.pipe(res);
      } else {
        throw new Error('[API:renderDL] No file key provided');
      }
    } catch (error) {
      logger.error(`"[API:renderDL] ${error}`);
      Sentry.captureException(error);
      res.status(500).send({
        error: 'Internal Server Error',
        errName: error.name,
        errMessage: error.message,
        errDescription: error.description
      });
    }
  }
);
