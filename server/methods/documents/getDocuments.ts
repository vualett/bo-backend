import { Meteor } from 'meteor/meteor';
import Documents from '../../collections/documents';
import Security from '../../../server/utils/security';
import * as Sentry from '@sentry/node';
import { AWS_REGION, AWS_DOCS_BUCKET_NAME } from '../../keys';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import logger from '../../../server/logger/log';
Meteor.methods({
  getDocumentsByUserId: async function (userId: string) {
    Security.checkLoggedIn(Meteor.userId());
    Security.checkRole(Meteor.userId(), ['super-admin', 'admin', 'technical', 'validation']);
    const documents = await Documents.find({ userId }).fetchAsync();
    return documents;
  },
  userDocuments: async function (key: string) {
    try {
      if (!key) {
        throw new Meteor.Error(400, 'No file key provided');
      }

      const client = new S3Client({ region: AWS_REGION });
      const command = new GetObjectCommand({ Bucket: AWS_DOCS_BUCKET_NAME, Key: key });

      const url = await getSignedUrl(client, command, { expiresIn: 600 });

      return url;
    } catch (error) {
      const typedError = error as Error;
      logger.error(`"[API:documents] ${typedError.message}`);
      Sentry.captureException(error);
    }
  }
});
