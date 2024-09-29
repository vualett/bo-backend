import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import AssetReports from '../../collections/assetReports';

interface Params {
  userId: string;
}

export async function getUserMaxCapacityToAdvance(props: Params): Promise<number> {
  const { userId } = props;

  try {
    const user = await Meteor.users.findOneAsync({ _id: userId });

    if (!user) {
      throw new Meteor.Error('USER_NOT_FOUND!');
    }

    const inDBPLaidAssetReports = user.plaidAssetReport.filter((a) => a.inDB);

    const plaidAssetReports = inDBPLaidAssetReports.sort((a, b) => {
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });

    const recentAssetReport = plaidAssetReports[0] ?? {};

    const assetReport = (await AssetReports.findOneAsync({ asset_report_id: recentAssetReport?.assetReportId })) as
      | Meteor.AssetReport
      | undefined;

    if (!assetReport) {
      throw new Meteor.Error('ASSET_REPORT_NOT_FOUND');
    }

    const accounts: Meteor.Account = assetReport.items[0]?.accounts[0];

    if (accounts.days_available !== 90) {
      throw new Meteor.Error('ASSET_REPORT_NOT_90_DAYS');
    }

    const income90Days = accounts.transactions
      .filter((t) => t.amount < 0)
      .map((a) => ({ ...a, amount: Math.abs(a.amount) }));

    const totalIncome90Days = income90Days.map((a) => a.amount).reduce((a, b) => a + b, 0);

    const userMaxCapacityToAdvance = Number((totalIncome90Days * 4 * 0.28).toFixed(2));

    return userMaxCapacityToAdvance;
  } catch (error) {
    logger.error(`Error in getUserMaxCapacityToAdvance {${userId}}`, error);
    throw error;
  }
}
