import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import clientFunction from 'twilio';
import formatNumber from '../../utils/formatNumber';
import logger from '../../logger/log';
import { parsePhoneNumber } from 'libphonenumber-js';
import { Settings } from '../../collections/settings';
import * as Sentry from '@sentry/node';
import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_ID } from '../../keys';

const client = clientFunction(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function twilioVerify(phone) {
  check(phone, String);
  const formattedNumber = formatNumber(phone);

  try {
    await client.verify
      .services(TWILIO_VERIFY_SERVICE_ID)
      .verifications.create({ to: formattedNumber, channel: 'sms' });
  } catch (err) {
    logger.error(`sendPhoneVerificationCode ${err}`);
    Sentry.captureException(err);
    throw new Meteor.Error('Internal Server Error', err.code, err.moreInfo);
  }
}

export function validatePhoneNumber({ phone }) {
  const _phone = parsePhoneNumber(phone, 'US');
  if (_phone.isValid()) {
    return true;
  } else {
    const extraCodes = Settings.findOne({ _id: 'extraCodes' });
    if (extraCodes?.value?.length) {
      return extraCodes.value.includes(phone.substring(0, 3));
    }
  }
}

Meteor.methods({
  sendPhoneVerificationCode: twilioVerify,
  validatePhoneNumber
});
