/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
import { Meteor } from 'meteor/meteor';
import { s3 } from '../../../aws/services';
import { saveDbFile } from './saveUserId';
import { AWS_DOCS_BUCKET_NAME } from '../../../keys';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';
import { updateDocuments } from '../../../../server/methods/users/set/setConfigMethods';
import changeStatus from '../../../../server/methods/users/changeStatus';
import changeSubStatus from '../../../../server/methods/users/changeSubStatus';
import { STATUS, STAGE } from '../../../../server/consts/user';

interface DTOdocuments {
  ETag: string;
  ServerSideEncryption: string;
  Location: string;
  Key: string;
  Bucket: string;
}

Meteor.methods({
  uploadUserDocument: async function (base64Data: string, userId: string, fileName: string, type: string) {
    try {
      const data = Buffer.from(base64Data, 'base64');
      const key = `${userId}/${fileName}`;

      const uploadParams = {
        Bucket: AWS_DOCS_BUCKET_NAME,
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

      if (user?.offStage?.stage === STAGE.UNDERWRITING.STAGE_5) {
        //  set the document as complete and disable the requirement
        updateDocuments(userId, fileName, 'complete', true);
        await Meteor.users.updateAsync(
          { _id: userId },
          { $set: { 'requirements.$[elem].enable': false } },
          {
            arrayFilters: [{ 'elem.type': 'document', 'elem.complete': false }]
          }
        );
        await Meteor.users.updateAsync(
          { _id: userId, 'requirements.name': 'Argyle', 'requirements.complete': false },
          { $set: { 'requirements.$.enable': false, canSyncArgyle: false } }
        );
        //

        await changeStatus({ userId, status: STATUS.INFO_SUBMITTED, agentId: undefined });
        await changeSubStatus({ userId, subStatus: undefined, agentId: undefined });
      }

      return { send: true, s3Response };
    } catch (error: unknown) {
      const { message } = error as Meteor.Error;
      logger.error(`uploadUserDocument: ${userId} [${message}]`);
      Sentry.captureException(error);
      throw new Meteor.Error(500, 'Error al cargar el archivo!');
    }
  }
});
