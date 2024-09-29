import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { $ } from 'moneysafe';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Deals from '../../collections/deals';
import Security from '../../utils/security';

function removeBonus(dealID, paymentNumber) {
  check(dealID, String);
  check(paymentNumber, Number);

  Security.checkAccess(this.userId, ['technical', 'super-admin']);

  const deal = Deals.findOne({ _id: dealID });
  if (!deal) throw new Meteor.Error('DEAL_NOT_FOUND');

  const _payment = deal.payments.find((p) => p.number === paymentNumber);

  if (!_payment) throw new Meteor.Error('INVALID_PAYMENT_NUMBER');
  if (!_payment.fee && !_payment.principal) throw new Meteor.Error('PAYMENT_BAD_STRUCTURE');
  if (_payment.status !== 'schedule') throw new Meteor.Error('PAYMENT_STATUS_INVALID');

  if (!_payment.bonus) throw new Meteor.Error('PAYMENT_WITHOUT_BONUS');

  const newFee = $(_payment.fee).add(_payment.bonus).valueOf();
  const newAmount = $(_payment.amount).add(_payment.bonus).valueOf();

  const updated = Deals.update(
    {
      _id: dealID,
      'payments.number': paymentNumber
    },
    {
      $set: {
        'payments.$.amount': newAmount,
        'payments.$.fee': newFee
      },
      $unset: {
        'payments.$.bonus': '',
        'payments.$.bonusApplied': '',
        'payments.$.appliedBy': ''
      },
      $inc: {
        bonus: -Math.abs(_payment.bonus)
      }
    }
  );

  if (!updated) throw new Meteor.Error('FAIL_UPDATING_CASHADVANCE');

  Meteor.users.update({ _id: deal.userId }, { $inc: { bonusPaid: -Math.abs(_payment.bonus) } });

  Meteor.call('logs.insert', deal.userId, `$${_payment.bonus} bonus reverted from payment #${paymentNumber}`);
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.removeBonus'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: removeBonus
});
