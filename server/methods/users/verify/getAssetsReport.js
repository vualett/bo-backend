import { Meteor } from 'meteor/meteor';
import AssetReports from '../../../collections/assetReports';

export default async function getAssetsReport(userId) {
  const user = await Meteor.users.findOne({ _id: userId });
  if (!user) throw new Meteor.Error('user not found');

  const { assetReportId } = user.plaidAssetReport[user.plaidAssetReport.length - 1];
  if (!assetReportId) throw new Meteor.Error('user does not have assetReportToken');

  const report = await AssetReports.findOne({ asset_report_id: assetReportId });
  if (!report) throw new Meteor.Error(403, 'not AssetReport');
  return report;
}
