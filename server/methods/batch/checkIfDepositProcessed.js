import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import checkIfProcessed from '../deals/checkIfProcessed';
import { groupBy } from '../../utils/utils';
import logger from '../../logger/log';
import Security from '../../utils/security';
import * as Sentry from '@sentry/node';
export default async function batchCheckIfDepositProcessed() {
  try {
    const deals = await Deals.find({ status: 'approved' }).fetch();
    const processes = deals.map(async (d) => checkIfProcessed(d._id));

    const results = await Promise.all(processes);
    const mapped = results.map((p) => ({ status: p }));

    const grouped = groupBy(mapped, 'status');

    return grouped;
  } catch (error) {
    logger.error(`batchCheckIfDepositProcessed: ${error}`);
    Sentry.captureException(error);
    throw new Meteor.Error('Error');
  }
}

Meteor.methods({
  'batch.checkIfDepositProcessed': function batchCheckIfDepositProcessedMethod() {
    this.unblock();
    Security.checkIfAdmin(this.userId);
    batchCheckIfDepositProcessed();
  }
});
