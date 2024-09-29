/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { Meteor } from 'meteor/meteor';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';
import Deals from '../../../collections/deals';
import Security from '../../../utils/security';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import checkIfNewDatesValid from '../reschedulePayments/checkIfNewDatesValid';
import capitalizeFirstLetterOfEachWord from '../../../utils/capitalizeFirstLetterOfEachWord';
import reschedulePayment from '../reschedulePayments/reschedulePayment';

interface IUndoDD {
  paymentNumber: number;
  dealID: string;
  newDate: Date;
}

async function undoDirectDeposit(params: IUndoDD): Promise<boolean> {
  const { dealID, paymentNumber, newDate } = params;

  Security.checkRole(Meteor.userId(), ['super-admin', 'technical']);

  try {
    const deal = Deals.findOne({ _id: dealID });

    if (!deal) {
      throw new Meteor.Error('DEAL_NOT_FOUND');
    }

    const user = Meteor.users.findOne({ _id: deal.userId });

    if (!user) {
      throw new Meteor.Error('USER_NOT_FOUND');
    }

    const payment = deal.payments.find((p) => p.number === paymentNumber);

    if (payment?.status !== 'paid' || !payment?.directDeposit) {
      throw new Meteor.Error('PAYMENT_IS_NOT_A_DIRECT_DEPOSIT*');
    }

    checkIfNewDatesValid(payment.date, newDate);

    await reschedulePayment({
      dealID: deal._id,
      doMetric: false,
      rescheduledBy: Meteor.userId(),
      payment,
      newDate
    });

    const _by = Meteor.users.findOne({ _id: Meteor.userId() as string });

    const by = {
      name: capitalizeFirstLetterOfEachWord(_by?.firstName ?? ''),
      id: _by?._id ?? ''
    };

    Meteor.call('notes.insert', {
      message: `Undo direct deposit on remittance ${payment.number}`,
      userId: user._id,
      where: 'user',
      by
    });

    return true;
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`[${dealID}] ${JSON.stringify(error)}`);
    throw error;
  }
}

const method = {
  type: 'method',
  name: 'deals.undoPaidWithDirectDeposit'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: undoDirectDeposit
});
