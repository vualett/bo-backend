import { Meteor } from 'meteor/meteor';
import logger from '../logger/log';
import Security from '../utils/security';
import subDays from 'date-fns/subDays';
export async function promotersList() {
  try {
    // Security.checkIfAdmin(Meteor.userId());
    let Days = subDays(new Date(), 21);
    const promoters = await (async () =>
      Meteor.users
        .rawCollection()
        .aggregate([
          {
            $match: {
              isPromoter: true,
              promoterSince: {
                $gt: Days
              }
            }
          },
          {
            $project: {
              _id: 1,
              firstName: 1,
              lastName: 1
            }
          }
        ])
        .toArray())();

    return await promoters;
  } catch (error: unknown) {
    const { message } = error as Error;
    logger.error(`users.promotersList21:${message}`);
  }
}

Meteor.methods({
  'users.promotersList21': promotersList
});
