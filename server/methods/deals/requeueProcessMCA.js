import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import JobQueue from '../../collections/jobQueue';
import { queueProcessMCA } from '../../queue/queue';
import Security from '../../utils/security';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
export default async function requeueProcessMCA(dealId) {
  check(dealId, String);
  Security.checkRole(this.userId, ['technical']);

  try {
    const job = await JobQueue.findOne(
      {
        name: 'processMCA',
        'data.dealId': dealId
      },
      { sort: { lastRunAt: -1 } }
    );

    if (!job) throw new Meteor.Error('no job');

    queueProcessMCA({
      ...job.data,
      base64Sign: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAl0AAAF/CAYAAAB9stx+/H/yrGbf1o0i+wAAAABJRU5ErkJggg=='
    });

    return job;
  } catch (err) {
    logger.error(`deals.requeueProcessMCA: ${err}`);
    Sentry.captureException(err);
    if (err.error === 'no job') {
      throw new Meteor.Error('No job found for this deal');
    } else {
      throw new Meteor.Error('Internal Server Error');
    }
  }
}

Meteor.methods({
  'deals.requeueProcessMCA': requeueProcessMCA
});
