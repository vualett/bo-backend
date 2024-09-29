import { Meteor } from 'meteor/meteor';
import logger from '../logger/log';
import twilio from 'twilio';
import { check } from 'meteor/check';
import * as Sentry from '@sentry/node';
import {
  ENV,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_MESSAGING_ACCOUNT_NOTIFICATION_SID,
  TWILIO_MESSAGING_CUSTOMER_CARE_SID,
  TWILIO_MESSAGING_MARKETING_SID
} from '../keys';

const client = new twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export default async function sendTwilioMessage({ body, service, to, userId }) {
  if (!to && !userId) throw new Meteor.Error('NO RECIPIENT');

  let phoneNumber = to;

  if (userId) {
    const user = Meteor.users.findOne({ _id: userId });
    phoneNumber = user.phone.number;
  }

  try {
    let messagingServiceSid = '';
    switch (service) {
      case 'marketing':
        messagingServiceSid = TWILIO_MESSAGING_MARKETING_SID;
        break;
      case 'accNotification':
        messagingServiceSid = TWILIO_MESSAGING_ACCOUNT_NOTIFICATION_SID;
        break;
      case 'customerCare':
        messagingServiceSid = TWILIO_MESSAGING_CUSTOMER_CARE_SID;
        break;
      default:
        throw new Error('NO SERVICE PROVIDED');
    }

    if (Meteor.isDevelopment || ENV === 'staging') return;

    await client.messages.create({
      body,
      messagingServiceSid,
      to: phoneNumber
    });
  } catch (error) {
    logger.error(`sendTwilioMessage [${userId}] ${JSON.stringify(error)}`);
    Sentry.captureException(error);
    throw new Meteor.Error('ERROR SENDING MESSAGE', error);
  }
}
