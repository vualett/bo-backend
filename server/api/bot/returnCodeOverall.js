import { getTransferLogs } from '../../methods/TransferLogs';

export default async () => {
  const results = await getTransferLogs();
  const processed = results.filter((f) => f.status === 'processed');
  const failed = results.filter((f) => f.status === 'failed');

  const ratio = (failed.length / (processed.length + failed.length)) * 100;
  return `${ratio.toFixed(2)}%`;
};
