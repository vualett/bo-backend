import logger from '../../logger/log';
import { Meteor } from 'meteor/meteor';
import * as Sentry from '@sentry/node';
export default async function resetAssignCount(job, done) {
  try {
    const result = await Meteor.users.update(
      { isAdmin: true, assignCount: { $gte: 1 } },
      { $set: { assignCount: 0 } },
      {
        multi: true
      }
    );
    if (result) {
      job.attrs.results = { accountsAffected: result };
      done();
    } else {
      throw new Error('Nothing returned');
    }
  } catch (error) {
    job.fail(error);
    Sentry.captureException(error);
    logger.error(`agenda.jobs.resetAssignCount: ${error}`);
    done();
  }
}
