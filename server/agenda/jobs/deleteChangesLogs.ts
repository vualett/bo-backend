import { Meteor } from 'meteor/meteor';
import { DataChangesLogs } from '../../collections/dataChangesLogs';
import { subDays } from 'date-fns';
import { Job } from '@hokify/agenda';

export default async function deleteChangesLogs(job: Job, done: (Error?: string | Error) => void): Promise<void> {
  const dateAddDays = subDays(new Date(), 3);
  try {
    await DataChangesLogs.removeAsync({ createdAt: { $lt: dateAddDays } });
    done();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;

    job.fail(message);
    done();
  }
}
