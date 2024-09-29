import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import AssetReports from '../../../collections/assetReports';
import Security from '../../../utils/security';
import * as Sentry from '@sentry/node';
import logger from '../../../../server/logger/log';
function controlApproval(reportId) {
  try {
    check(reportId, String);
    Security.checkIfAdmin(this.userId);

    const set = {
      approved: true,
      approvedDate: new Date(),
      inReview: false
    };

    AssetReports.update({ asset_report_id: reportId }, { $set: set });
    Meteor.users.update(
      { 'plaidAssetReport.assetReportId': reportId },
      {
        $set: {
          'plaidAssetReport.$.approved': true,
          'plaidAssetReport.$.approvedDate': set.approvedDate,
          'plaidAssetReport.$.inReview': false
        }
      }
    );
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`users.assetsReport.controlApproval: ${error}`);
  }
}

Meteor.methods({ 'users.assetsReport.controlApproval': controlApproval });
