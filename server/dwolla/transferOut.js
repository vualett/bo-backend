import dwollaTransfer from './transfer';

export default async function dwollaTransferOut(fundingUrl, amount, metadata, idempotencyKey, RTPEnabled) {
  return dwollaTransfer({
    direction: 'out',
    fundingUrl,
    amount,
    metadata,
    idempotencyKey,
    RTPEnabled
  });
}
