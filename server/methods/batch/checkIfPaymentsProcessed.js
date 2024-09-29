import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import checkIfPaymentProcessed from '../deals/checkIfPaymentProcessed';
import { groupBy } from '../../utils/utils';
import logger from '../../logger/log';
import Security from '../../utils/security';
import * as Sentry from '@sentry/node';
export default async function batchCheckIfPaymentsProcessed() {
  try {
    const deals = await Deals.find({ status: 'active' }).fetch();

    const payments = deals
      .map((d) => d.payments.filter((p) => p.status === 'pending').map((pp) => ({ dealId: d._id, ...pp })))
      .filter((val) => val.length > 0)
      .reduce((acc, val) => acc.concat(val), []);

    const processes = payments.map(async (p) => checkIfPaymentProcessed(p.dealId, p.number));

    const results = await Promise.all(processes);
    const mapped = results.map((p) => ({ status: p }));
    const grouped = groupBy(mapped, 'status');

    return grouped;
  } catch (error) {
    logger.error(`batchCheckIfPaymentsProcessed: ${error}`);
    Sentry.captureException(error);
    throw new Meteor.Error('Error');
  }
}

Meteor.methods({
  'batch.checkIfPaymentsProcessed': async function batchCheckIfPaymentsProcessedMethod() {
    this.unblock();
    Security.checkIfAdmin(this.userId);
    await batchCheckIfPaymentsProcessed();
  }
});
