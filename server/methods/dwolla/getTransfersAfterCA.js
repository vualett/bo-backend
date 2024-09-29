import format from 'date-fns/format';
import Dwolla from '../../dwolla/dwolla';

export default async function checkDwollaTransfersCA(user, deal) {
  const { dwollaCustomerURL } = user;
  const { createdAt } = deal;

  const result = await Dwolla().get(
    `${dwollaCustomerURL}/transfers?limit=100&startDate=${format(new Date(createdAt || null), 'yyyy-MM-dd')}`
  );
  const { _embedded } = result.body;
  if (_embedded.transfers.length === 0) return [];

  const payments = _embedded.transfers.map((p) => ({
    amount: p.amount.value,
    status: p.status,
    date: p.created,
    transactionId: p.id,
    metadata: p.metadata
  }));

  return payments;
}
