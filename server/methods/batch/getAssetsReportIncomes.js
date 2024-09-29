import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';
import getAssetsReport from '../users/verify/getAssetsReport';
import { getTotalIncomeAmount } from '/server/plaid/storeAssetsReportInDB';
import { asyncForEach } from '/server/utils/utils';
import logger from './../../logger/log';
import * as Sentry from '@sentry/node';
export default async function getAssetsReportIncomes() {
  try {
    const usersWithNoAssetsReportMetric = await Meteor.users
      .find({
        'metrics.assetsReport.income': { $exists: false },
        isAdmin: { $exists: false },
        plaidAssetReport: { $elemMatch: { inDB: { $exists: true } } }
      })
      .fetch();

    let errors = [];

    await asyncForEach(usersWithNoAssetsReportMetric, async (item) => {
      try {
        const report = await getAssetsReport(item?._id);

        const totalIncomeAmount = await getTotalIncomeAmount(report, item);

        if (totalIncomeAmount > 0) {
          Meteor.users.update({ _id: item._id }, { $set: { 'metrics.assetsReport.income': totalIncomeAmount } });
        }
      } catch (error) {
        logger.error(`batch.getAssetsReportIncomes: ${error}`);
        Sentry.captureException(error);
        errors.push({ user: item?._id, error });
      }
    });
    return errors;
  } catch (error) {
    logger.error(`batch.getAssetsReportIncomes: ${error}`);
    Sentry.captureException(error);

    throw new Meteor.Error('batch.getAssetsReportIncomes failed', error);
  }
}

Meteor.methods({
  'batch.getAssetsReportIncomes': async function getAssetsReportIncomesMethod() {
    this.unblock();
    Security.checkRole(this.userId, 'super-admin');
    return await getAssetsReportIncomes();
  }
});
