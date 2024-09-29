import getTransfer from '../../../dwolla/getTransfer';
import logger from '../../../logger/log';
import { queueProcessDeal, queueProcessPayment } from '../../../queue/queue';
import logTransfer from '../../../logs/transferLogs';
import { STAGE, STATUS, SUB_STATUS } from '../../../consts/user';
import { Meteor } from 'meteor/meteor';
import changeSubStatus from '../../../methods/users/changeSubStatus';
import changeStatus from '../../../methods/users/changeStatus';

export default async function webhookCustomerTransferCompleted(payload) {
  const transferUrl = payload._links.resource.href;
  const transfer = await getTransfer(transferUrl);

  if (!transfer.metadata) return logger.info('webhook without metadata', transfer);
  const { dealId, transferReason, userId } = transfer.metadata;

  if (transferReason === 'cash_advance_transfer') {
    queueProcessDeal({ dealId });

    const user = await Meteor.users.findOneAsync({ _id: userId });
    if (user?.offStage?.stage === STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10) {

      if (user?.offStage?.status !== STATUS.APPROVED_DEAL_IN_PROCESS) {
        await changeStatus({
          userId,
          status: STATUS.APPROVED_DEAL_IN_PROCESS
        });
      }

      await changeSubStatus({
        userId,
        subStatus: SUB_STATUS.TRANSFER_IN_PROCESS
      });
    }
  }

  if (transferReason === 'collect_payment') {
    queueProcessPayment({ dealId, paymentNumber: Number(transfer.metadata.paymentNumber), transferUrl });
  }
  logTransfer(transfer);
  return true;
}
