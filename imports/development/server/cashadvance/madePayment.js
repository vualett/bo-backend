// DEV
import { Meteor } from 'meteor/meteor';
import webhookCustomerTransferCompleted from '../../../../server/api/webhooks/dwolla/customerTransferCompleted';
import Deals from '../../../../server/collections/deals';
import Security from '../../../../server/utils/security';

function madePayments(userID) {
  this.unblock();
  Security.checkIfAdmin(this.userId);

  const user = Meteor.users.findOne({ _id: userID });
  const { currentCashAdvance } = user;
  const cashAdvanceID = currentCashAdvance.id;
  const cashAdvance = Deals.findOne({ _id: cashAdvanceID });
  const { payments } = cashAdvance;
  const paymentesInitated = payments.filter((p) => p.status === 'pending' && p.transferUrl);

  paymentesInitated.map(({ transferUrl }) => {
    const payload = { _links: { resource: { href: transferUrl } } };
    return webhookCustomerTransferCompleted(payload);
  });
}

Meteor.methods({ '_dev.users.processPayments': madePayments });
