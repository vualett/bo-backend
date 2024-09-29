import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Deals from '../../collections/deals';
import Security from '../../utils/security';

function getCashAdvanceHistory(userId) {
  Security.checkIfAdmin(this.userId);
  check(userId, String);

  function transform(doc) {
    const newDoc = doc;

    function paid() {
      const payments = doc.payments.filter((p) => p.status === 'paid');
      const total = payments.map((p) => p.amount).reduce((a, b) => a + b, 0);

      return {
        count: payments.length,
        total
      };
    }

    function score() {
      const { payments } = doc;
      const declined = payments.filter((p) => p.declinedAt);
      const factor = (declined.length / payments.length) * 100;
      return factor;
    }
    newDoc.paid = paid();
    newDoc.quality = score();
    return newDoc;
  }

  const cashadvances = Deals.find({ userId, status: 'completed' }, { transform }).fetch();
  return cashadvances;
}

Meteor.methods({ 'users.getCashAdvanceHistory': getCashAdvanceHistory });
