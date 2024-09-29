import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import getTransfer from '../../dwolla/getTransfer';
import Deals from '../../collections/deals';
import processDeal from './processDeal/processDeal';
import Security from '../../utils/security';

export default async function checkIfProcessed(dealId) {
  check(dealId, String);

  const deal = await Deals.findOne({ _id: dealId });
  const { transferUrl } = deal;

  if (!transferUrl) return false;

  const transfer = await getTransfer(transferUrl);

  if (!transfer) return false;

  if (transfer.status === 'processed' && deal.status === 'approved') processDeal(deal._id);

  return transfer.status;
}

Meteor.methods({
  'deals.checkIfProcessed': function checkIfProcessedMethod(params) {
    Security.checkIfAdmin(this.userId);
    return checkIfProcessed(params);
  }
});
