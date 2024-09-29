import webhookCustomerTransferCompleted from './customerTransferCompleted';
import webhookCustomerTransferFailed from './customerTransferFailed';
import webhookCustomerFundingSourceRemoved from './customerFundingSourceRemoved';
import webhookTransferCancelled from './transfer_cancelled';
import webhookCustomerFundingSourceAdded from './customerFundingSourceAdded';

export default function processWebhooks(payload) {
  // customer related
  if (payload.topic === 'customer_transfer_completed') webhookCustomerTransferCompleted(payload);
  if (payload.topic === 'customer_transfer_failed') webhookCustomerTransferFailed(payload);
  if (payload.topic === 'customer_funding_source_removed') webhookCustomerFundingSourceRemoved(payload);
  if (payload.topic === 'customer_transfer_cancelled') webhookTransferCancelled(payload);
  if (payload.topic === 'customer_funding_source_added') webhookCustomerFundingSourceAdded(payload);
}
