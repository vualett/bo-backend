import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import Security from '/server/utils/security';
import categorization from './categorization';
export default async function bulkCategorization() {
  try {
    Security.checkRole(Meteor.userId(), ['superAdmin']);
    let userData = await Meteor.users
      .rawCollection()
      .aggregate([
        {
          $match: {
            'metrics.cashAdvances.count': {
              $gte: 1
            }
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
      //Meteor.users.update({ _id: item._id }, { $set: {currentCashAdvance: false } });
      categorization(item._id, 'first run');
    });

    return { result: userData.length };
  } catch (error) {
    const { message } = error as Error;
    logger.error(`users.bulkCategorization:${message}`);
  }
}

Meteor.methods({ 'users.bulkCategorization': bulkCategorization });
