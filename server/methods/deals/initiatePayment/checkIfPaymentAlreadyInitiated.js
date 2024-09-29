import getTransfer from '../../../dwolla/getTransfer';

export default async function checkIfPaymentAlreadyInitiated(payment, user, ca) {
  const { transferUrl, status } = payment;

  if (status === 'paid' || status === 'pending') return true;

  if (transferUrl) {
    const transferStatus = await getTransfer(transferUrl).then((r) => r.status);
    if (!['failed', 'cancelled'].includes(transferStatus)) return true;
  }

  return false;
}
