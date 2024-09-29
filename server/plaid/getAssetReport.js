import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { check } from 'meteor/check';
import logger from '../logger/log';
import plaidClient from './plaid';
import AssetReports from '../collections/assetReports';
import Security from '../utils/security';
import storeAssetsReportInDB from './storeAssetsReportInDB';

export default async function getAssetReportFromPlaid(userId, _assetReportId) {
  try {
    const user = await Meteor.users.findOne({ _id: userId });

    if (!user) throw new Meteor.Error('user not found');

    if (!user.plaidAssetReport && !user.plaidAssetReport[user.plaidAssetReport.length - 1].assetReportToken)
      throw new Meteor.Error('user does not have assetReportToken');

    const latest = user.plaidAssetReport[user.plaidAssetReport.length - 1];
    const { assetReportId, assetReportToken } = latest;

    const reportId = _assetReportId || assetReportId;

    const inDB = await AssetReports.findOne({ asset_report_id: reportId });

    if (inDB) {
      const { item_id, institution_name } = inDB.items[0];
      Meteor.users.update(
        { _id: userId, 'plaidAssetReport.assetReportId': reportId },
        {
          $set: {
            'plaidAssetReport.$.inDB': inDB._id,
            'plaidAssetReport.$.itemID': item_id,
            'plaidAssetReport.$.institutionName': institution_name
          }
        }
      );
      return inDB;
    }

    const request = {
      asset_report_token: assetReportToken
    };

    const assetReport = await plaidClient.assetReportGet(request);
    await storeAssetsReportInDB(assetReport.data, userId);
    return assetReport.data;
  } catch (error) {
    logger.error(`plaid.getAssetReportFromPlaid [${userId}] ${JSON.stringify(error)}`);
    if (error && error.error_code === 'PRODUCT_NOT_READY') throw new Meteor.Error('NOT_READY');

    Meteor.users.update(
      { _id: userId, 'plaidAssetReport.assetReportId': reportId },
      { $set: { 'plaidAssetReport.$.error': error } }
    );
    throw new Meteor.Error(error);
  }
}

const method = {
  type: 'method',
  name: 'plaid.getAssetReportFromServer'
};

DDPRateLimiter.addRule(method, 1, 500);

Meteor.methods({
  'plaid.getAssetReportFromServer': function getAssetReport(userId, _assetReportId) {
    check(userId, String);
    check(_assetReportId, String);
    Security.checkRole(this.userId, ['financial']);
    getAssetReportFromPlaid(userId, _assetReportId);
  }
});
