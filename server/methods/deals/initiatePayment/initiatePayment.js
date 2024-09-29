import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Deals from '../../../collections/deals';
import dwollaTransfer from '../../../dwolla/transfer';
import logger from '../../../logger/log';
import checkIfPaymentAlreadyInitiated from './checkIfPaymentAlreadyInitiated';
import { sendInitiatedPaymentEmail } from '../../../emails/emails';
import * as Sentry from '@sentry/node';
import { setDateInOverdueInDeal } from '../setDateInOverdueDeal';
import checkIfPaymentProcessed from '../checkIfPaymentProcessed';
import { STAGE, STATUS, SUB_STATUS } from '../../../consts/user';
import changeStatus from '../../users/changeStatus';
import changeSubStatus from '../../users/changeSubStatus';

export default async function initiatePayment(dealId, paymentNumber, idempotencyKey, by, sendEmail, clearing) {
  check(dealId, String);
  check(paymentNumber, Number);

  const Deal = Deals.findOne({ _id: dealId });

  try {
    if (!['active', 'closed'].includes(Deal.status)) {
      throw new Meteor.Error('CASH_ADVANCE_BAD_STATUS');
    }

    const payment = Deal.payments.find((p) => p.number === paymentNumber);

    const User = Meteor.users.findOne({ _id: Deal.userId });

    const isPaymentAlreadyInitiated = await checkIfPaymentAlreadyInitiated(payment, User, Deal);
    if (isPaymentAlreadyInitiated) {
      checkIfPaymentProcessed({ dealID: Deal._id, paymentNumber: payment.number });
    }

    const transferMetadata = {
      dealId: Deal._id,
      userId: Deal.userId,
      paymentNumber: payment.number,
      transferReason: 'collect_payment'
    };


    if (Deal.debitChannel === 'SAME_DAY_ACH') {
      clearing = { source: 'next-available' };
    }

    const transferUrl = await dwollaTransfer({
      direction: 'in',
      fundingUrl: User.dwollaFundingURL,
      amount: payment.amount,
      metadata: transferMetadata,
      idempotencyKey,
      clearing
    });

    if (!transferUrl) throw new Meteor.Error('ERROR_TRANSFER');

    const initiatedAt = new Date();

    const set = {
      'payments.$.status': 'pending',
      'payments.$.initiatedAt': initiatedAt,
      'payments.$.initiatedBy': by || null,
      'payments.$.transferUrl': transferUrl
    };

    Deals.update(
      { _id: dealId, 'payments.number': paymentNumber },
      {
        $set: set,
        $push: { 'payments.$.transfers': { status: 'pending', transferUrl, initiatedAt } }
      }
    );

    await setDateInOverdueInDeal(dealId);

    if (sendEmail) sendInitiatedPaymentEmail(User, payment);

    if ([STAGE.UNDERWRITING.STAGE_9, STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10].includes(User?.offStage?.stage)) {

      if (User?.offStage?.status !== STATUS.ACTIVE_NO_ISSUES) {
        await changeStatus({
          userId: User._id,
          agentId: by || undefined,
          status: STATUS.ACTIVE_NO_ISSUES
        });
      }

      await changeSubStatus({
        userId: User._id,
        agentId: by || undefined,
        subStatus: SUB_STATUS.REMITTANCE_IN_PROCESS
      });
    }

    return true;
  } catch (error) {
    Deals.update(
      { _id: dealId, 'payments.number': paymentNumber },
      { $set: { 'payments.$.errorMessage': error?.body?._embedded?.errors[0]?.message } }
    );

    logger.error(`[dealID: ${dealId}] [paymentNumber:${paymentNumber}] ${JSON.stringify(error)}`);
    Sentry.captureException(error);
    throw error;
  }
}
