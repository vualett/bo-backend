import { Job } from '@hokify/agenda';
import { Meteor } from 'meteor/meteor';
import { deactivatedCheck2 } from '../../methods/users/deactivatedCheck2';

export default async function sendAutomaticCheck2(job: Job, done: () => void): Promise<void> {
  try {
    await deactivatedCheck2();

    done();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;
    job.fail(message);
    done();
  }
}
