import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import AssetReports from '../collections/assetReports';

export default async function findFromAssetsReports({ bank, mask, userId }) {
  check(bank, String);
  check(mask, String);
  check(userId, String);
  const message = bank.concat(',', mask);

  const results = await AssetReports.rawCollection()
    .aggregate([
      {
        $search: {
          index: 'assetsreport',
          text: {
            query: message,
            path: {
              wildcard: '*'
            }
          }
        }
      }
    ])
    .toArray();

  if (results.length > 0) {
    const mapped = results.map((r) => ({ userID: r.user.client_user_id }));
    const uniq = [...new Set(mapped)];

    Meteor.users.update(
      { _id: userId },
      {
        $set: {
          hasMatches: true,
          matchesFound: uniq
        }
      }
    );

    return uniq;
  }
  return false;
}
