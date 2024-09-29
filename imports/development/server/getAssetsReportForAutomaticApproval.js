// DEV
import { Meteor } from 'meteor/meteor';
import assetsReportReady from '../../../server/api/webhooks/plaid/assetsReportReady';
import Logs from '../../collections/logs';
import AssetReports from '../../collections/assetReports';
import Security from '../../../server/utils/security';

async function verifiedUser(userId, category) {
  const user = Meteor.users.findOne({ _id: userId });

  const categoryToSet = category || user.category;

  const set = {
    'status.verified': true,
    'status.qualify': true,
    'status.unqualifiedReason': '',
    verifiedDate: new Date(),
    category: categoryToSet.toLowerCase(),
    automaticApproved: true
  };

  Meteor.users.update({ _id: userId }, { $set: set });

  const log = {
    type: 'verification',
    userId,
    decision: 'approved',
    category,
    who: {
      name: 'Automatic Approved',
      id: Meteor.userId()
    },
    timestamp: new Date()
  };

  Logs.insert(log);

  return true;
}

function getReport(userID) {
  this.unblock();
  Security.checkIfAdmin(this.userId);

  const user = Meteor.users.findOne({ _id: userID });
  const { plaidAssetReport } = user;
  const { assetReportId } = plaidAssetReport[plaidAssetReport.length - 1];
  assetsReportReady(assetReportId);
  verifiedUser(userID, 'c');

  Meteor.setTimeout(() => {
    AssetReports.update(
      {
        asset_report_id: assetReportId,
        'items.0.accounts.mask': user.bankAccount.mask
      },
      {
        $set: {
          'items.0.accounts.$.owners.0.names.0': `${user.firstName} ${user.lastName}`,
          'items.0.accounts.$.owners.0.emails': [
            {
              data: user.emails[0].address
            }
          ],
          'items.0.accounts.$.owners.0.phone_numbers': [
            {
              data: user.phone.number
            }
          ],
          'items.0.accounts.$.owners.0.addresses': [
            {
              data: {
                city: user.address.city,
                state: user.address.state,
                street: user.address.street1,
                zip: user.address.postal_code
              }
            }
          ],
          'items.0.accounts.$.historical_balances': [
            {
              current: 4000,
              date: '2020-05-06',
              iso_currency_code: 'USD',
              unofficial_currency_code: null
            },
            {
              current: 5000,
              date: '2020-06-06',
              iso_currency_code: 'USD',
              unofficial_currency_code: null
            }
          ],
          'items.0.accounts.$.transactions': [
            {
              account_id: 'Wde8WrdJeVTge3XDDQZlIZdwkj1QJwFloGlm9',
              amount: -3000,
              date: '2020-02-12',
              iso_currency_code: 'USD',
              original_description: 'Uber',
              pending: false,
              transaction_id: 'BQglB7QwgAfoQ5D66M9khlrjqxGoaPFwN1Jpb',
              unofficial_currency_code: null
            },
            {
              account_id: 'Wde8WrdJeVTge3XDDQZlIZdwkj1QJwFloGlm9',
              amount: -1000,
              date: '2020-02-12',
              iso_currency_code: 'USD',
              original_description: 'Lyft',
              pending: false,
              transaction_id: 'BQglB7QwgAfoQ5D66M9khlrjqxGoaPFwN1Jpb',
              unofficial_currency_code: null
            },
            {
              account_id: 'Wde8WrdJeVTge3XDDQZlIZdwkj1QJwFloGlm9',
              amount: -2000,
              date: '2020-02-12',
              iso_currency_code: 'USD',
              original_description: 'Amazon',
              pending: false,
              transaction_id: 'BQglB7QwgAfoQ5D66M9khlrjqxGoaPFwN1Jpb',
              unofficial_currency_code: null
            }
          ]
        }
      }
    );
  }, 1000);
}

Meteor.methods({ '_dev.users.getAssetsReportForAutomaticApproval': getReport });
