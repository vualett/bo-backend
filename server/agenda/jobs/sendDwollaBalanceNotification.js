import logger from '../../logger/log';
import numeral from 'numeral';
import { fetch, Headers } from 'meteor/fetch';
import * as Sentry from '@sentry/node';
import getUalettFundingBalance from '../../methods/dwolla/getUalettFundingBalance';
import { BOTS_WEBHOOKS_DWOLLA_BOT } from '../../keys';

export default async function sendDwollaBalanceNotification(job, done) {
  try {
    const { balance } = await getUalettFundingBalance();

    if (job.attrs.results === balance) { return done(); }

    const msg = `Dwolla Balance: *${numeral(balance).format('$0,0')}*`;

    await fetch(BOTS_WEBHOOKS_DWOLLA_BOT, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json; charset=utf-8'
      }),
      body: JSON.stringify({
        text: msg
      })
    });
    job.attrs.results = balance;
    await job.save();
    done();
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    job.fail(error);
    done();
  }
}
