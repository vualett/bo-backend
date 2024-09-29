import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../../utils/security';
import logger from '../../../../server/logger/log';
import plaidClient from '../../../plaid/plaid';
import * as Sentry from '@sentry/node';
import markItemLoginRequired from '../../../plaid/markItemLoginRequired';
import findFromAssetsReports from '../../findRelationsInAssetsReports';
import { PLAID_WEBHOOK_URL } from '../../../keys';

export default async function createAssetReport(userId, days) {
  const daysRequested = days || 90;
  const user = Meteor.users.findOne({ _id: userId });

  if (!user) throw new Meteor.Error('user not found');
  if (!user.plaidAccessToken) throw new Meteor.Error('user does not have plaidAccessToken');

  const dateNow = new Date().toISOString().replace('-', '').split('T')[0].replace('-', '');

  const clientReportId = `${user._id}-${dateNow}`;

  const options = {
    client_report_id: clientReportId,
    webhook: PLAID_WEBHOOK_URL,
    user: {
      client_user_id: userId
    }
  };

  try {
    const request = {
      access_tokens: [user.plaidAccessToken],
      days_requested: daysRequested,
      options
    };

    const assetReport = await plaidClient.assetReportCreate(request);

    const toUpdate = {
      $push: {
        plaidAssetReport: {
          assetReportId: assetReport.data.asset_report_id,
          assetReportToken: assetReport.data.asset_report_token,
          requestedAt: new Date()
        }
      }
    };
    if (user && user.matchesFound === undefined) {
      findFromAssetsReports({ bank: user?.bankAccount?.bankName, mask: user?.bankAccount?.mask, userId });
    }

    if (!user.status.qualify && user.status.unqualifiedReason === 'does not meet the requirements') {
      toUpdate.$set = {
        'status.qualify': true,
        'status.unqualifiedReason': ''
      };
    }

    Meteor.users.update({ _id: user._id }, toUpdate);
  } catch (error) {
    markItemLoginRequired(user._id, error);

    Sentry.captureException(error);
    logger.error(`plaid.createAssetReport [${userId}] ${JSON.stringify(error)}`);
    throw error;
  }
}

const method = {
  type: 'method',
  name: 'plaid.createAssetReport',
  connectionId: () => true
};

DDPRateLimiter.addRule(method, 1, 500);

Meteor.methods({
  [method.name]: async function createAssetReportMethod(userId, days) {
    check(userId, String);
    Security.checkRole(this.userId, ['super-admin', 'admin', 'control', 'financial', 'overdue', 'riskProfile']);

    return createAssetReport(userId, days);
  }
});
