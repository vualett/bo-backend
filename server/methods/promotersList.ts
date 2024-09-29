import { Meteor } from 'meteor/meteor';
import logger from '../logger/log';
import Security from '../utils/security';

export async function promotersList() {
  try {
    Security.checkIfAdmin(Meteor.userId());

    const promoters = await (async () =>
      Meteor.users
        .rawCollection()
        .aggregate([
          {
            $match: {
              isPromoter: true
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

    return promoters;
  } catch (error: unknown) {
    const { message } = error as Error;
    logger.error(`users.promotersList:${message}`);
  }
}

Meteor.methods({
  'users.promotersList': promotersList
});
