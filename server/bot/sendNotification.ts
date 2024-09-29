import { Meteor } from 'meteor/meteor';
import { fetch, Headers } from 'meteor/fetch';
import logger from '../logger/log';
import * as Sentry from '@sentry/node';
import { BOTS_WEBHOOKS_BO_BOT, ENV } from '../keys';

export async function sendNotification(msg: String) {
  try {
    if (Meteor.isDevelopment && ENV !== 'staging') return;

    await fetch(BOTS_WEBHOOKS_BO_BOT, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json; charset=utf-8'
      }),
      body: JSON.stringify({
        text: msg
      })
    });
  } catch (error: unknown) {
    const { message } = error as Error;
    Sentry.captureException(error, { extra: msg });
    logger.error(`sendNotification: ${message}`);
  }
}
