import { Meteor } from 'meteor/meteor';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';
import Security from '../../../utils/security';
export default async function bulKQuitCurrentCashAdvance() {
  try {
    Security.checkRole(Meteor.userId(), ['superAdmin']);
    let userData = await Meteor.users
      .rawCollection()
      .aggregate([
        {
          $lookup: {
            from: 'deals',
            localField: 'currentCashAdvance.id',
            foreignField: '_id',
            as: 'Advance'
          }
        },
        {
          $match: {
            $and: [
              {
                'Advance.status': {
                  $eq: 'completed'
                }
              },
              {
                'currentCashAdvance.status': {
                  $eq: 'active'
                }
              }
            ]
          }
        }
      ])
      .toArray();
    async function asyncForEach(array: any, callback: any) {
      for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
      }
    }
    await asyncForEach(userData, async (item: any) => {
      Meteor.users.update({ _id: item._id }, { $set: { currentCashAdvance: false } });
    });

    return { result: userData.length };
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`deals.bulKQuitCurrentCashAdvance:${error}`);
  }
}
Meteor.methods({ 'deals.bulKQuitCurrentCashAdvance': bulKQuitCurrentCashAdvance });
