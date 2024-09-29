import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Deals from '../../../collections/deals';
import agenda from '../../../agenda/agenda';
import logger from '../../../logger/log';
import Security from '../../../utils/security';
import { capitalizeFirstLetterOfEachWord } from '../../../utils/utils';
import * as Sentry from '@sentry/node';
import checkInvitationAndApplyBonus from '../../invitations/checkInvitationAndApplyBonus';
import { checkCanShare } from '../../users/verify/checkCanShare';
import { updateCanShare } from '../../users/set/setConfigMethods';
import { setDateInOverdueInDeal } from '../setDateInOverdueDeal';
import { addPaidToODTask } from '../../tasks/overdue/addPaidToODTask';
import completeDeal from '../completeCashAdvance/completeDeal';
async function markDirectDeposit(dealId, paymentNumber, reference) {
  check(dealId, String);
  check(paymentNumber, Number);
  check(reference, String);

  Security.checkAccess(Meteor.userId(), ['markDirectDeposit']);

  const deal = Deals.findOne({ _id: dealId });
  const user = Meteor.users.findOne({ _id: deal.userId });

  const payment = deal.payments.find((p) => p.number === paymentNumber);
  const allPayments = deal.payments.filter((payment) => payment.status !== 'paid' && payment.status !== 'pending');

  if (payment.status === 'paid') return false;

  try {
    await agenda.cancel({
      name: 'collect_payment',
      'data.dealId': dealId,
      'data.paymentNumber': paymentNumber
    });

    const set = {
      'payments.$.status': 'paid',
      'payments.$.paidAt': new Date(),
      'payments.$.directDeposit': true,
      'payments.$.directDepositReference': reference
    };

    Deals.update({ _id: dealId, 'payments.number': paymentNumber }, { $set: set });
    if (allPayments.length === 1 && allPayments !== undefined) {
      completeDeal(dealId);
    }
    await setDateInOverdueInDeal(deal._id);

    Meteor.defer(addPaidToODTask.bind(undefined, { user, dealID: deal._id, paymentNumber }));

    const _by = Meteor.users.findOne({ _id: this.userId });
    const by = {
      name: capitalizeFirstLetterOfEachWord(_by.firstName),
      id: this.userId
    };

    // Set canShare depending on the result of the function checkCanShare
    const updatedDeal = Deals.findOne({ _id: dealId });
    const clientCanShare = checkCanShare(updatedDeal, user);
    if (user.canShare !== clientCanShare) updateCanShare(updatedDeal.userId, clientCanShare);

    Meteor.call('notes.insert', {
      message: `Direct deposit on remittance ${paymentNumber}`,
      where: 'user',
      userId: deal.userId,
      by
    });

    await checkInvitationAndApplyBonus({
      paymentNumber,
      invitedUser: deal.userId,
      deal
    });

    return true;
  } catch (e) {
    Sentry.captureException(e);
    logger.error(`[${deal.userId}] ${JSON.stringify(e)}`);
    throw e;
  }
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.paidWithDirectDeposit'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: markDirectDeposit
});
