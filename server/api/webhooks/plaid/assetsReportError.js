import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import logger from '../../../logger/log';

export default async function assetsReportError(reportId, error) {
  check(reportId, String);
  check(error, Object);

  if (error.error_code !== 'DATA_UNAVAILABLE') {
    logger.error(`PLAID: [ASSETS] ${JSON.stringify(error)}`);
  }

  const user = Meteor.users.findOne({
    'plaidAssetReport.assetReportId': reportId
  });

  if (user) {
    Meteor.users.update(
      {
        'plaidAssetReport.assetReportId': reportId
      },
      {
        $set: {
          'plaidAssetReport.$.error': error
        }
      }
    );
  }
}
