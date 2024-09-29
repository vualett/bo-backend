// DEV
import { Meteor } from 'meteor/meteor';
import assetsReportReady from '../../../server/api/webhooks/plaid/assetsReportReady';
import Security from '../../../server/utils/security';

function getReport(userID) {
  this.unblock();
  Security.checkIfAdmin(this.userId);

  const user = Meteor.users.findOne({ _id: userID });
  const { plaidAssetReport } = user;
  const { assetReportId } = plaidAssetReport[plaidAssetReport.length - 1];
  assetsReportReady(assetReportId);
}

Meteor.methods({ '_dev.users.getAssetsReport': getReport });
