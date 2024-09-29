import { Meteor } from 'meteor/meteor';
import AssetReports from '../collections/assetReports';

export default async function storeAssetsReportInDB(assets, userId) {
  const report = {
    ...assets.report,
    warnings: assets.warnings
  };

  if (await AssetReports.findOne({ asset_report_id: report.asset_report_id })) throw new Meteor.Error('ALREADY_IN_DB');

  const insertID = await AssetReports.insert(report);

  const user = Meteor.users.findOne({ _id: userId });

  const totalIncomeAmount = await getTotalIncomeAmount(report, user);

  if (insertID) {
    Meteor.users.update(
      { _id: userId, 'plaidAssetReport.assetReportId': report.asset_report_id },
      {
        $set: {
          'plaidAssetReport.$.inDB': insertID,
          'metrics.assetsReport.income': totalIncomeAmount
        }
      }
    );
  }
}

function findLinkedAccount(bankAccounts, User) {
  const { bankAccount } = User;

  const linkedAccount = bankAccount
    ? bankAccounts.find((a) => (bankAccount.mask ? a.mask === bankAccount.mask : a.account_id === bankAccount.id))
    : false;

  return linkedAccount || false;
}

function transactionsOverview(_transactions) {
  const transactions = _transactions || [];
  const incomeTransactions = transactions
    .filter((a) => a.amount < 0)
    .map((a) => ({ ...a, amount: Math.abs(a.amount) }));

  const totalIncomeAmount = incomeTransactions.map((a) => a.amount).reduce((a, b) => a + b, 0);

  return {
    totalIncomeAmount
  };
}

export function getTotalIncomeAmount(report, user) {
  if (!report) throw new Error('No report');

  const accounts = report.items[0].accounts.filter((a) => a.type === 'depository');
  const linkedAccount = findLinkedAccount(accounts, user);
  const { transactions } = linkedAccount;
  const { totalIncomeAmount } = transactionsOverview(transactions || []);

  return totalIncomeAmount;
}
