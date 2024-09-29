import { Meteor } from 'meteor/meteor';
import axios from 'axios';
import { ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY, ONESIGNAL_URL } from '../keys';

interface ParamsSendNotification {
  targetId: string;
  title: string;
  message: string;
}

interface NotifyResult {
  recipients: number;
}

export const sendNotification = async ({ targetId, title, message }: ParamsSendNotification): Promise<void> => {
  const user = Meteor.users.findOne({ _id: targetId });

  if (user === undefined) {
    throw new Meteor.Error(403, 'User not found');
  }

  const requestOptions = {
    headers: {
      accept: 'application/json',
      Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  const body = {
    app_id: ONESIGNAL_APP_ID,
    include_external_user_ids: [targetId],
    channel_for_external_user_ids: 'push',
    contents: { en: message },
    headings: { en: title }
  };

  await axios.post<NotifyResult>(`${ONESIGNAL_URL}/notifications`, body, requestOptions);
};
