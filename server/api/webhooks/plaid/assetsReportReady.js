import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import getAssetReportFromPlaid from '../../../plaid/getAssetReport';

export default async function assetsReportReady(reportId) {
  check(reportId, String);

  const user = Meteor.users.findOne({
    'plaidAssetReport.assetReportId': reportId
  });

  if (user) {
    getAssetReportFromPlaid(user._id, reportId);
  }
}
