import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { $ } from 'moneysafe';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Deals from '../../../collections/deals';
import Security from '../../../utils/security';
import insertLog from '../../logs/insertGenericLog';
import { isDealInOverdue } from '../../deals/requestDeal/utils';

function applyBonus({ dealID, bonusAmount, paymentNumber }) {
  check(dealID, String);
  check(bonusAmount, Number);
  check(paymentNumber, Number);

  Security.checkLoggedIn(this.userId);

  const user = Meteor.users.findOne({ _id: this.userId });

  if (bonusAmount > user.bonusAvailable) throw new Meteor.Error('AMOUNT NOT AVAILABLE');

  if (!user.currentCashAdvance || user.currentCashAdvance.status !== 'active' || user.currentCashAdvance.id !== dealID)
    throw new Meteor.Error('INVALID DEAL');

  const deal = Deals.findOne({ _id: dealID });
  if (!deal) throw new Meteor.Error('DEAL_NOT_FOUND');

  if (isDealInOverdue(deal.payments)) throw new Meteor.Error('OVERDUE: PLEASE CONTACT US');

  const _payment = deal.payments.find((p) => p.number === paymentNumber);

  if (_payment.fee < bonusAmount) {
    bonusAmount = _payment.fee;
  }

  if (!_payment) throw new Meteor.Error('INVALID_PAYMENT_NUMBER');
  if (_payment.status !== 'schedule') throw new Meteor.Error('PAYMENT_STATUS_INVALID');
  if (_payment.bonusApplied) throw new Meteor.Error('BONUS_ALREADY_APPLIED');
  if (!_payment.fee && !_payment.principal) throw new Meteor.Error('PAYMENT_BAD_STRUCTURE');
  if (bonusAmount > _payment.fee) throw new Meteor.Error('BONUS_AMOUNT_TOO_BIG');

  const newFee = $(_payment.fee).minus(bonusAmount).valueOf();
  const newAmount = $(_payment.amount).minus(bonusAmount).valueOf();

  const updated = Deals.update(
    {
      _id: dealID,
      'payments.number': paymentNumber
    },
    {
      $set: {
        'payments.$.amount': newAmount,
        'payments.$.fee': newFee,
        'payments.$.bonus': bonusAmount,
        'payments.$.bonusApplied': new Date(),
        'payments.$.appliedBy': this.userId
      },
      $inc: {
        bonus: bonusAmount
      }
    }
  );

  if (!updated) throw new Meteor.Error('FAIL_UPDATING_CASHADVANCE');

  Meteor.users.update(
    { _id: this.userId },
    {
      $inc: { bonusPaid: bonusAmount },
      $set: {
        bonusAvailable: $(user.bonusAvailable).minus(bonusAmount).valueOf()
      }
    }
  );

  insertLog(this.userId, `$${bonusAmount} bonus applied by user`);
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'user.applyBonus'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: applyBonus
});
