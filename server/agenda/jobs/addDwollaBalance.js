import { fetch, Headers } from 'meteor/fetch';
import addToDwollaBalance from '../../methods/dwolla/addToDwollaBalance';
import { Settings } from '../../collections/settings';
import { getDay } from 'date-fns';
import numeral from 'numeral';
import * as Sentry from '@sentry/node';
import logger from '../../logger/log';
import { BOTS_WEBHOOKS_DWOLLA_BOT } from '../../keys';

async function sendMessageToDwollaBot(totalAmount) {
  const msg = `*${numeral(totalAmount).format('$0,0')}* transferred to *Dwolla Balance*`;

  return await fetch(BOTS_WEBHOOKS_DWOLLA_BOT, {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json; charset=utf-8'
    }),
    body: JSON.stringify({
      text: msg
    })
  });
}

const amountPerTransfer = 10000;
export default async function addDwollaBalance(job, done) {
  try {
    const settings = Settings.findOne({ _id: 'fundsToDwolla' });

    if (!settings) {
      logger.error('Settings::fundsToDwolla not found');
      job.fail('Settings::fundsToDwolla not found');
      return;
    }

    const { week } = settings;

    if (!week) throw new Error('No week set for funds to dwolla');

    const todayIndex = getDay(new Date());
    const todaysAmount = week[todayIndex];
    const count = Math.floor(todaysAmount / amountPerTransfer);

    const result = await addToDwollaBalance({ amount: amountPerTransfer, times: count });
    const successful = result.filter(({ status }) => status === 201);

    if (result) {
      sendMessageToDwollaBot(todaysAmount);
      job.attrs.results = `${successful.length} transfers of ${result.length} were successful`;
      done();
    } else {
      logger.error('[addDwollaBalance] Nothing returned');
      job.fail('[addDwollaBalance] Nothing returned');
    }
  } catch (error) {
    job.fail(error);
    Sentry.captureException(error);
    logger.error(`agenda.jobs.addDwollaBalance: ${error}`);
    done();
  }
}
