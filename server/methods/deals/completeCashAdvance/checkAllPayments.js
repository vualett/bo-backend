import { Meteor } from 'meteor/meteor';
import getTransfer from '../../../dwolla/getTransfer';

export default async function checkAllPayments(payments) {
  const paymentsResults = payments.map(async (obj) => {
    if (obj.directDeposit) return { status: 'processed', amount: { value: obj.amount } };
    return getTransfer(obj.transferUrl);
  });

  const result = await Promise.all(paymentsResults).then((completed) => ({
    allDone: completed.every((r) => r.status === 'processed'),
    totalPaid: completed.map((transfer) => Number(transfer.amount.value)).reduce((a, b) => a + b, 0)
  }));

  if (!result.allDone) throw new Meteor.Error('have failed payments');
  return result;
}
