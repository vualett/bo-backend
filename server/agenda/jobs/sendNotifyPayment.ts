import { Job } from '@hokify/agenda';
import { Meteor } from 'meteor/meteor';
import { sendNotifyDayBeforePayment } from '../../methods/deals/notifyOneDayBeforePayment';
export default async function sendNotifyPayment(job: Job, done: () => void): Promise<void> {
  try {
    await sendNotifyDayBeforePayment();

    done();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;
    job.fail(message);
    done();
  }
}
