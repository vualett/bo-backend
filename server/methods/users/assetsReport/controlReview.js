import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import AssetReports from '../../../collections/assetReports';
import Security from '../../../utils/security';
import * as Sentry from '@sentry/node';
import logger from '../../../../server/logger/log';
function controlReview(reportId) {
  try {
    check(reportId, String);
    Security.checkIfAdmin(this.userId);

    const set = {
      inReview: new Date()
    };

    AssetReports.update({ asset_report_id: reportId }, { $set: set });

    Meteor.users.update(
      { 'plaidAssetReport.assetReportId': reportId },
      {
        $set: {
          'plaidAssetReport.$.inReview': set.inReview
        }
      }
    );
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`users.assetsReport.controlReview: ${error}`);
  }
}

Meteor.methods({ 'users.assetsReport.controlReview': controlReview });
