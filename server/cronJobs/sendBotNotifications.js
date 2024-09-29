import cron from 'node-cron';
import { Meteor } from 'meteor/meteor';
import returnCodeOverall from '../api/bot/returnCodeOverall';
import { sendNotification } from '../bot/sendNotification';
import { ENV } from '../keys';

if (Meteor.isProduction && ENV !== 'staging') {
  cron.schedule(
    '0 12 * * 0', // 8AM on Sunday
    Meteor.bindEnvironment(async () => {
      const result = await returnCodeOverall();
      sendNotification(`*Return Code Overall:* \`${result}\``);
    })
  );
}
