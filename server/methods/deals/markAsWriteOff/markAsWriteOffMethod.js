import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../../utils/security';
import logger from '../../../logger/log';
import { sendNotification } from '../../../bot/sendNotification';
import sleep from '../../../utils/sleep';
import markAsWriteOff from './markAsWriteOff';

Meteor.methods({
  'deals.batchWriteOff': async function writeOffDealMethod(IDsArray, dateOfWriteOff, force) {
    check(IDsArray, [String]);
    check(dateOfWriteOff, String);

    Security.checkRole(this.userId, ['super-admin', 'technical']);

    const results = [];

    for (const id of IDsArray) {
      try {
        const result = await markAsWriteOff(id, dateOfWriteOff, force);
        results.push(`${id} : ${result}`);
        await sleep(100);
      } catch (error) {
        logger.error(`deals.batchWriteOff[${id}] ${JSON.stringify(error)}`);
        results.push(`${id} : ${error}`);
      }
    }

    sendNotification(`*"deals.batchWriteOff"*\n${JSON.stringify(results)}`);

    return results;
  }
});
