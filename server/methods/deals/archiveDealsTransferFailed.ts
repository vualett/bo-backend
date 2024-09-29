import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../utils/security';
import Deals from '../../collections/deals';
import getTransfer from '../../dwolla/getTransfer';
import insertLog from '../logs/insertGenericLog';
import { insertDataChangesLog } from '/server/dataChangesLogs';

export async function archiveDealIfTransferFailed(id: string) {
  check(id, String);
  Security.checkRole(this.userId, ['technical']);

  const deal = Deals.findOne({ _id: id });
  if (!deal) throw new Meteor.Error('deal_not_found');
  const { transferUrl } = deal;

  const transfer = await getTransfer(transferUrl);

  if (transfer) {
    if (transfer.status !== 'failed') {
      throw new Meteor.Error(`transfer_status_${transfer.status}`);
    }
    if (Number(transfer.amount.value) !== deal.amount) {
      throw new Meteor.Error(`transfer_amount_doesnt_match_${Number(transfer.amount.value)}_${deal.amount}`);
    }

    const updated = Deals.update({ _id: id }, { $set: { status: 'cancelled' } });

    if (!updated) {
      return false;
    } else {
      insertDataChangesLog({
        where: 'deals',
        documentID: deal._id,
        operation: 'update',
        method: 'archiveDealIfTransferFailed',
        createdBy: this.userId,
        old_data: deal,
        new_data: {
          ...deal,
          status: 'cancelled'
        }
      });
    }

    let InfoUser = Meteor.users.find({ _id: deal.userId });

    Meteor.users.update(
      { _id: deal.userId },
      { $set: { currentCashAdvance: false, 'metrics.cashAdvances.count': InfoUser?.metrics?.cashAdvances?.count - 1 } }
    );

    insertLog(deal.userId, `DEAL ${deal.amount} TRANSFER FAILED`);

    return true;
  }

  throw new Meteor.Error('getting_transfer_fail');
}

Meteor.methods({ 'deals.archiveIfTransferFailed': archiveDealIfTransferFailed });
