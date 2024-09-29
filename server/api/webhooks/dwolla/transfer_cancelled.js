import getTransfer from '../../../dwolla/getTransfer';
import logger from '../../../logger/log';

export default async function webhookTransferCancelled(payload) {
  const transferUrl = payload._links.resource.href;
  const transfer = await getTransfer(transferUrl);

  if (!transfer.metadata) return logger.info('webhook without metadata', transfer);
  const { dealId, transferReason, paymentNumber } = transfer.metadata;
  console.log('webhookTransferCancelled', dealId, transferReason, paymentNumber);
  return true;
}
