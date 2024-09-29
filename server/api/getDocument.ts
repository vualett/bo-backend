/* eslint-disable @typescript-eslint/no-misused-promises */
import logger from '../logger/log';
import { Meteor } from 'meteor/meteor';
import { API } from './api';
import { s3 } from '../aws/services';
import { Request, Response } from 'express';
import cors from 'cors';
import Security from '../utils/security';
import * as Sentry from '@sentry/node';
import { Accounts } from 'meteor/accounts-base';
import { IncomingHttpHeaders } from 'http';
import internal from 'stream';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { AWS_BUCKET_NAME, ENV } from '../keys';

interface CustomsHeaders {
  token: string;
  userid: string;
}

type IncomingCustomHeaders = IncomingHttpHeaders & CustomsHeaders;

const isDevOrStaging = Meteor.isDevelopment || ENV === 'staging';
const origin = isDevOrStaging
  ? ['http://localhost:3000', 'https://api-staging.ualett.com']
  : 'https://backoffice.ualett.com';

API.get('/get-document/:docId', cors({ origin }), async (req: Request, res: Response): Promise<void> => {
  try {
    const { docId } = req.params;
    const { userid, token } = req.headers as IncomingCustomHeaders;

    const hashedToken = Accounts._hashLoginToken(token);

    const found = Meteor.users.findOne({
      _id: userid,
      'services.resume.loginTokens': {
        $elemMatch: { hashedToken }
      }
    });

    if (!found) {
      throw new Error('unauthorized');
    }

    if (found.isAdmin && Security.hasRole(userid, ['admin', 'financial', 'riskProfile']) === false) {
      throw new Error('unauthorized');
    }

    if (!found.isAdmin) {
      Security.checkLoggedIn(userid);
    }

    const params = {
      Bucket: AWS_BUCKET_NAME,
      Key: `${docId}.pdf`
    };

    const command = new GetObjectCommand(params);

    const fileStream = await s3.send(command);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${docId}.pdf`
    });

    if (fileStream.Body instanceof internal.Readable) {
      const readableStream: internal.Readable = fileStream.Body as internal.Readable;
      readableStream.pipe(res);
      return;
    }

    res.send('nothing retuned');
  } catch (error: unknown) {
    Sentry.captureException(error);
    logger.error('API::download-mca', error);
    res.status(500).send('Internal Server Error');
  }
});
