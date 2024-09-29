import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import Security from '/server/utils/security';
import Timelogs from '/server/collections/timelogs';

export default async function bulkEventType() {
  try {
    Security.checkRole(Meteor.userId(), ['superAdmin']);
    let result = await Timelogs.rawCollection().update(
      { eventType: { $exists: false } },
      { $set: { eventType: 'user' } },
      { multi: true }
    );
    return true;
  } catch (error) {
    logger.error(`timelogs.bulkeventType:${error}`);
  }
}
Meteor.methods({ 'timelogs.bulkeventType': bulkEventType });
