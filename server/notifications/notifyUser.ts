import { Meteor } from 'meteor/meteor';
import { NotifyChannel } from './notifyChannel';
import logger from '../logger/log';
import { Notify } from './notify.interface';
import sendTwilioMessage from '../sms/sendTwilioMessage';
import * as Sentry from '@sentry/node';
import axios from 'axios';
import { ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY, ONESIGNAL_URL } from '../keys';

// channel could be either 2 values: 'PUSH' or 'SMS'
export default async function notifyUser(notify: Notify) {
  const user = Meteor.users.findOne({ _id: notify.userId });

  try {
    if (notify.channel === NotifyChannel.SMS) {
      await sendTwilioMessage({
        body: notify.body,
        service: notify.service,
        userId: notify.userId,
        to: notify.to
      });
      return;
    }

    if (notify.channel === NotifyChannel.PUSH) {
      const _config = {
        headers: {
          accept: 'application/json',
          Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
          'Content-Type': 'application/json'
        }
      };

      const _data = {
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [user?._id],
        channel_for_external_user_ids: 'push',
        contents: { en: notify.body },
        headings: { en: notify.service }
      };

      const res = await axios.post(`${ONESIGNAL_URL}/notifications`, _data, _config);

      // if PUSH was NOT sent
      if (res?.data.recipients === 0) {
        await sendTwilioMessage({
          body: notify.body,
          service: notify.service,
          userId: notify.userId,
          to: notify.to
        });
      }
    }
  } catch (error) {
    logger.error(`notifyUser: ${JSON.stringify(error)}`);
    Sentry.captureException(error);
  }
}
