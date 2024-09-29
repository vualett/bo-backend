import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import logger from '../../../server/logger/log';
import * as Sentry from '@sentry/node';
import Security from '../../utils/security';
import { Meteor } from 'meteor/meteor';
import insertLog from '../logs/insertGenericLog';

interface IParams {
  userId: string;
  downloadLink: string;
}

async function setDownloadLink(params: IParams): Promise<boolean> {
  if (
    !(
      Security.hasRole(Meteor.userId(), ['super-admin', 'technical']) ||
      Security.hasAccess(Meteor.userId(), ['managePromoters'])
    )
  ) {
    throw new Meteor.Error(401, 'YOU_ARE_NOT_AUTHORIZED!');
  }

  const { userId, downloadLink } = params;

  try {
    const promoter = await Meteor.users.findOneAsync({ _id: userId });

    if (!promoter) {
      throw new Meteor.Error(404, 'PROMOTER_NOT_FOUND!');
    }

    const updated = await Meteor.users.updateAsync(
      { _id: promoter._id },
      {
        ...(downloadLink
          ? {
              $set: { promoterDownloadLink: downloadLink }
            }
          : {
              $unset: { promoterDownloadLink: '' }
            })
      }
    );

    if (!updated) {
      throw new Meteor.Error(404, 'DOWNLOAD_LINK_NOT_UPDATED!');
    }

    insertLog(promoter._id, `Promoter download link updated for ${downloadLink || 'None'}`, Meteor.userId());

    return true;
  } catch (error) {
    const { message } = error as Error;
    logger.error(`promoters.setDownloadLink[${userId}]${message}`);
    Sentry.captureException(error);
    throw error;
  }
}

const method = {
  type: 'method',
  name: 'promoters.setDownloadLink'
};

DDPRateLimiter.addRule(method, 2, 5000);

Meteor.methods({
  [method.name]: setDownloadLink
});
