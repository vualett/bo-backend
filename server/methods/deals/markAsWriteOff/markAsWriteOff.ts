import { Meteor } from 'meteor/meteor';
import Deals from '../../../collections/deals';
import { isValid, parse } from 'date-fns';
import { daysInArreas } from '../utils';

async function checkReqs(deal: any, force: boolean = false) {
  const { status, payments, writeOffAt } = deal;

  // check if status is correct to do this action
  if (!['completed', 'active', 'closed'].includes(status)) {
    throw new Meteor.Error('DEAL_BAD_STATUS');
  }

  if (!force) {
    // check if deal is active
    if (payments.filter((payment: any) => payment.status === 'pending').length > 0) {
      throw new Meteor.Error('HAS_PENDING_PAYMENT');
    }

    // check if 90 days in arreas or more
    if (daysInArreas(deal) < 90) {
      throw new Meteor.Error('DEAL_NOT_IN_90_DAYS_ARREAS');
    }
  }
}

export default async function markAsWriteOff(dealID: string, dateOfWriteOff: string, force: boolean = false) {
  const deal = Deals.findOne({ _id: dealID, writeOffAt: { $exists: false } });
  if (!deal) throw new Meteor.Error('DEAL_NOT_FOUND_OR_ALREADY_WRITEOFF');

  const user = await Meteor.users.findOneAsync({ _id: deal.userId, isInBankruptcy: { $exists: true } });

  if (user) return;

  await checkReqs(deal, force);

  const writeOffDate = parse(dateOfWriteOff, 'yyyy-MM-dd', new Date());

  if (!isValid(writeOffDate)) throw new Error('WRONG_DATE_FORMAT');

  const setToUpdate: any = {
    accountingStatus: 'writeoff',
    writeOffAt: writeOffDate
  };

  if (deal.status === 'active') {
    setToUpdate.status = 'closed';
  }

  const update = await Deals.update({ _id: dealID }, { $set: setToUpdate });

  if (update) return true;
  return false;
}
