import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import Security from '../../utils/security';
import agenda from '../../agenda/agenda';

export default async function suspendDeal(id) {
  Security.checkRole(this.userId, ['super-admin', 'overdue']);

  const deal = Deals.findOne({ _id: id });
  if (!deal) throw new Meteor.Error('DEAL_NOT_FOUND');

  if (deal.payments.filter((p) => p.status === 'declined').length === 0)
    throw new Meteor.Error('DEAL_NOT_FAILED_PAYMENTS');

  Deals.update({ _id: id }, { $set: { status: 'suspended' } });

  Meteor.users.update(
    { _id: deal.userId },
    {
      $set: {
        'status.qualify': false,
        'status.verified': false,
        'status.preVerified': false,
        'status.unqualifiedReason': 'defaulted',
        'currentCashAdvance.status': 'suspended'
      }
    }
  );

  const result = await Promise.all(
    deal.payments.map(async (p) =>
      agenda.cancel({
        name: 'collect_payment',
        'data.dealId': id,
        'data.paymentNumber': p.paymentNumber
      })
    )
  );

  Meteor.call('notes.insert', { message: 'DEFAULTED', where: 'user', userId: deal.userId }, true);
  return result;
}

// UNSUSPEND METHOD
function unsuspendDeal(id) {
  Security.checkRole(this.userId, ['super-admin', 'overdue']);

  const deal = Deals.findOne({ _id: id });

  Deals.update({ _id: id }, { $set: { status: 'active' } });

  Meteor.users.update(
    { _id: deal.userId },
    {
      $set: {
        'status.qualify': true,
        'status.verified': true,
        'status.preVerified': true,
        'status.unqualifiedReason': '',
        'currentCashAdvance.status': 'active'
      }
    }
  );

  return true;
}

Meteor.methods({
  'deals.suspend': suspendDeal,
  'deals.unsuspend': unsuspendDeal
});
