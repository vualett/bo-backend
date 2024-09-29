import getTransfer from '../../../dwolla/getTransfer';
import declinePayment from '../../../methods/deals/declinePayment';
import { sendNotification } from '../../../bot/sendNotification';
import logTransfer from '../../../logs/transferLogs';
import { Meteor } from 'meteor/meteor';
import { STAGE, STATUS, SUB_STATUS } from '../../../consts/user';
import changeSubStatus from '../../../methods/users/changeSubStatus';
import changeStatus from '../../../methods/users/changeStatus';

export default async function webhookCustomerTransferFailed(payload) {
  const transferUrl = payload._links.resource.href;
  const transfer = await getTransfer(transferUrl);
  let failure;

  if (transfer.status === 'failed') {
    failure = await getTransfer(`${transferUrl}/failure`);
  }

  const { transferReason, userId } = transfer.metadata;

  if (transferReason === 'cash_advance_transfer') {
    await sendNotification(
      `Cash advance transfer to customer failed\nDealID: \`${transfer.metadata.dealId}\`\n<https://backoffice.ualett.com/user/${transfer.metadata.userId}|${transfer.metadata.userId}>`
    );

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
        subStatus: SUB_STATUS.TRANSFER_FAILED
      });
    }
    else if (user?.offStage?.stage === STAGE.SALES.STAGE_8) {
      await changeStatus({
        userId,
        status: STATUS.TRANSFER_REQUEST_BLOCKED
      });
    }
  }

  if (transferReason === 'collect_payment') {
    await declinePayment({
      id: transfer.metadata.dealId,
      paymentNumber: Number(transfer.metadata.paymentNumber),
      returnCode: failure.code,
      initiatedAt: transfer.createdDate
    });
  }

  logTransfer({ ...transfer, failure });
}
