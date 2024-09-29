import { Meteor } from 'meteor/meteor';
import logger from '../logger/log';
import updateAccount from './updateAccount';
import Security from '../utils/security';
import * as Sentry from '@sentry/node';
export default async function bulKUpdateEmailDwolla() {
  try {
    Security.checkRole(Meteor.userId(), ['superAdmin']);
    let userData = await Meteor.users
      .rawCollection()
      .aggregate([
        {
          $match: {
            dwollaCustomerURL: {
              $exists: true
            },
            'emails.verified': true
          }
        },
        {
          $project: {
            email: {
              $arrayElemAt: ['$emails.address', 0]
            },
            dwollaCustomerURL: 1,
            firstName: 1,
            lastName: 1
          }
        }
      ])
      .toArray();

    async function asyncForEach(array: any, callback: any) {
      for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
      }
    }
    let errors = [];
    await asyncForEach(userData, async (item: any) => {
      try {
        const userObj = {
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
          ipAddress: '190.94.18.120'
        };

        await updateAccount(item.dwollaCustomerURL.split('/').pop(), userObj);
      } catch (error: unknown) {
        const { message } = error as Error;
        logger.error(`dwolla.bulkUpdateEmailDwolla:${message}`);
        errors.push({ user: item?.email, error });
      }
    });

    return { result: userData.length, errors: errors, TotalErrors: errors.length };
  } catch (error: unknown) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`dwolla.bulkUpdateEmailDwolla:${message}`);
  }
}
Meteor.methods({ 'dwolla.bulkUpdateEmailDwolla': bulKUpdateEmailDwolla });
