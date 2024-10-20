/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
import { Meteor } from 'meteor/meteor';
import { s3 } from '../../../aws/services';
import { saveDbFile } from './saveUserId';
import { AWS_SIGNATURES_BUCKET_NAME } from '../../../keys';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';

interface DTOdocuments {
  ETag: string;
  ServerSideEncryption: string;
  Location: string;
  Key: string;
  Bucket: string;
}

interface UploadSignatureResponse {
  send: boolean;
  s3Response: DTOdocuments;
}

// Function to upload a user document and handle S3 and user updates
export const uploadSignature = async (
  base64Data: string,
  userId: string,
  fileName: string,
  type: string
): Promise<UploadSignatureResponse> => {
  try {
    const data = Buffer.from(base64Data, 'base64');
    const key = `${fileName}`;

    const uploadParams = {
      Bucket: AWS_SIGNATURES_BUCKET_NAME,
      Key: key,
      Body: data,
      ContentEncoding: 'base64',
      ContentType: type,
      Date: new Date()
    };

    const s3Response = await s3.send(new PutObjectCommand(uploadParams));

    await saveDbFile({
      userId,
      date: new Date(),
      Key: key,
      DocumentName: fileName,
      ...(s3Response as unknown as DTOdocuments)
    });

    const user = await Meteor.users.findOneAsync({ _id: userId });

    if (!user) throw new Meteor.Error('USER_NOT_FOUND');

    return { send: true, s3Response: s3Response as unknown as DTOdocuments };
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;
    logger.error(`uploadAdvanceRemittanceSignature: ${userId} [${message}]`);
    Sentry.captureException(error);
    throw new Meteor.Error(500, 'Error saving signature!');
  }
};
