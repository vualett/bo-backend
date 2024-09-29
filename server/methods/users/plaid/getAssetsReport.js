import { Meteor } from 'meteor/meteor';
import AssetReports from '../../../collections/assetReports';
import Security from '../../../utils/security';
import { STAGE, STATUS, SUB_STATUS } from '../../../consts/user';
import changeSubStatus from '../changeSubStatus';

async function getAssetReport(userId, _assetReportId) {
  Security.checkRole(Meteor.userId(), [
    'super-admin',
    'admin',
    'technical',
    'financial',
    'overdue',
    'audit',
    'qa',
    'validation',
    'riskProfile'
  ]);
  let reportID = _assetReportId || false;

  const user = await Meteor.users.findOne({ _id: userId });

  if (!_assetReportId) {

    if (!user) throw new Meteor.Error('USER_NOT_FOUND');

    if (!user.plaidAssetReport) {
      throw new Meteor.Error('USER_DOES_NOT_HAVE_ASSETREPORT');
    }

    const { assetReportId, error } = user.plaidAssetReport[user.plaidAssetReport.length - 1];
    if (error) throw new Meteor.Error(error);
    reportID = assetReportId;
  }

  const report = await AssetReports.findOne({ asset_report_id: reportID });

  if (!report) throw new Meteor.Error('NOT_READY');

  if (
    user?.offStage?.stage === STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10 &&
    [STATUS.REACTIVATION_REQUEST, STATUS.UPGRADE].includes(user?.offStage?.status)
  ) {
    const validationAssignedAgent = user.assignedAgent.find((i) => i.category === 'validation' && i.agent.id === Meteor.userId());
    if (validationAssignedAgent) {

      if (user?.offStage?.subStatus !== SUB_STATUS.EVALUATING) {
        await changeSubStatus({
          userId: user._id,
          agentId: Meteor.userId(),
          subStatus: SUB_STATUS.EVALUATING,
        });
      }

    }
  }

  return report;
}

Meteor.methods({
  'users.getAssetReport': getAssetReport
});
