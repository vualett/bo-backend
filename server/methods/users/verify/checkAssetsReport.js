import { Meteor } from 'meteor/meteor';
import matchSorter, { rankings } from 'match-sorter';
import getAssetsReport from './getAssetsReport';
import checkOwnerInfoWithOther from './checkOwnerInfoWithOther';

function hasUalettTransaction(transactions) {
  const ualettTransaction = matchSorter(transactions, ['CABICASH SOLUTIO'], {
    keys: ['original_description'],
    threshold: rankings.CONTAINS
  });

  if (ualettTransaction.length > 1) return true;
  return false;
}

function findLinkedAccount(userAssetReport, User) {
  const accounts = userAssetReport.items[0].accounts.filter((a) => a.type === 'depository');

  const { bankAccount } = User;

  const linkedAccount = accounts.find((a) =>
    bankAccount.mask ? a.mask === bankAccount.mask : a.account_id === bankAccount.id
  );

  return linkedAccount || false;
}

export default async function checkAssetsReport(user) {
  const userAssetReport = await getAssetsReport(user._id);

  const linkedAccount = findLinkedAccount(userAssetReport, user);

  if (!linkedAccount) throw new Meteor.Error(403, 'not linked bank account');
  if (hasUalettTransaction(linkedAccount.transactions)) throw new Meteor.Error(403, 'has Ualett transaction');
  if (checkOwnerInfoWithOther(linkedAccount)) throw new Meteor.Error(403, 'Owner info check failed');
}
