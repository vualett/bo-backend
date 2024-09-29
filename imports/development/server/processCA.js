import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { $ } from 'moneysafe';
import { addDays, getISODay } from 'date-fns';
import Security from '../../../server/utils/security';
import Deals from '../../../server/collections/deals';
import getPaymentDay from '../../../server/methods/deals/processDeal/getPaymentDay';
import { GetArrayPayments } from '../../../server/utils/calculateInstallments';

async function processCA(userID) {
  check(userID, String);
  Security.checkRole(Meteor.userId(), ['super-admin', 'technical']);

  const deals = await Deals.find({ userId: userID }).fetchAsync();

  const deal = deals[deals.length - 1];

  if (!deal) throw new Meteor.Error('DEAL_NOT_FOUND');

  if (deal.status !== 'approved') {
    throw new Meteor.Error('DEAL_IS_NOT_APPROVED');
  }

  const user = Meteor.users.findOne({ _id: deal.userId });

  const activateAt = new Date();

  const set = {
    status: 'active',
    activateAt
  };

  const paymentDate = getPaymentDay(new Date(), user.paymentISODay);

  set.payments = GetArrayPayments({
    dealAmount: deal.amount,
    numberOfPayments: deal.numberOfPayments,
    feeAmount: deal.amount * deal.fee,
    paymentDate,
    isReadjusting: false
  });

  set.feeAmount = set.payments.reduce((acc, curr) => $(acc).add(curr.fee).valueOf(), 0);

  const totalAmountToPaid = set.payments.map((p) => $(p.amount).valueOf()).reduce((a, b) => $(a).add(b).valueOf(), 0);

  if (Math.round(totalAmountToPaid) !== Math.round($(deal.amount).add(set.feeAmount).valueOf())) {
    throw new Meteor.Error('ERROR_UPDATING_DEAL');
  }

  set.dateInOverdue = addDays(paymentDate, 4);

  const updated = Deals.update({ _id: deal._id }, { $set: set });

  if (!updated) throw new Meteor.Error('ERROR_UPDATING_DEAL');

  const userSet = {
    'currentCashAdvance.status': 'active',
    'currentCashAdvance.activateAt': activateAt
  };

  if (!user.paymentISODay) userSet.paymentISODay = getISODay(paymentDate);

  Meteor.users.update(
    { _id: user._id },
    {
      $inc: {
        'metrics.cashAdvances.count': 1,
        'metrics.cashAdvances.totalTaken': deal.amount
      },
      $set: userSet
    }
  );
}

Meteor.methods({
  '_dev.users.processCA': processCA
});
