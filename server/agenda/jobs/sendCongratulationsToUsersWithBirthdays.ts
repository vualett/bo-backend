import { Job } from '@hokify/agenda';
import logger from '../../../server/logger/log';
import { Meteor } from 'meteor/meteor';
import { getUsersWithBirthdayIds } from '../../methods/users/getUsersWithBirthdayIds';
import { sendCongratulations } from '../../methods/sendCongratulations';

export default async function sendCongratulationsToUsersWithBirthdays(
  job: Job,
  done: (err?: Error | undefined) => void
): Promise<void> {
  try {
    const userIds = await getUsersWithBirthdayIds();

    await Promise.all(userIds.map(async (userId) => await sendCongratulations(userId)));

    done();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;

    job.fail(message);
    logger.error(`Error running job sendCongratulationsToUsersWithBirthdays: ${message}`);
    done();
  }
}
