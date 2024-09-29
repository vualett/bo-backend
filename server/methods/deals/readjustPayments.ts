/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
// @ts-ignore
import { $ } from 'moneysafe';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Deals from '../../collections/deals';
import Security from '../../utils/security';
import { insertDataChangesLog } from '../../dataChangesLogs';
import { CalculateAmountAvg, GetArrayPayments, GetInstallments } from '../../utils/calculateInstallments';
import { setDateInOverdueInDeal } from './setDateInOverdueDeal';

interface Arguments {
  id: string;
  weeklyAmountToPay: number;
  firstDate: Date;
  isBiweekly: boolean | undefined;
  payments: Meteor.Payment[];
}

export default async function readjustPayments({
  id,
  weeklyAmountToPay,
  firstDate,
  isBiweekly,
  payments
}: Arguments): Promise<boolean> {
  check(id, String);
  check(weeklyAmountToPay, Number);
  check(firstDate, Date);
  check(isBiweekly, Match.OneOf(Boolean, undefined));
  check(payments, Match.OneOf(Array, undefined));

  Security.checkAccess(Meteor.userId(), ['readjustPayments', 'readjustRemittances']);

  const deal = Deals.findOne({ _id: id });
  if (deal === undefined) {
    throw new Meteor.Error(`[readjustPayment] [${id}]: DEAL_NOT_FOUND`);
  }

  const isAdjustRemaining = Boolean(payments);

  const remittances = isAdjustRemaining ? payments : deal.payments;

  if (remittances.some((p) => p.status === 'pending')) {
    throw new Meteor.Error('PENDING_PAYMENT');
  }

  if (remittances.filter((p) => p.status !== 'paid').some((p) => p.bonus && p.bonus > 0)) {
    throw new Meteor.Error('PENDING_PAYMENT_WITH_BONUS');
  }

  if (remittances.some((p) => isNaN(p.principal))) {
    throw new Meteor.Error('PAYMENT_WITHOUT_PRINCIPAL');
  }

  if (remittances.some((p) => isNaN(p.fee))) {
    throw new Meteor.Error('PAYMENT_WITHOUT_FEE');
  }

  const totalAmountFromOldPymntArray = deal.payments
    .map((p: Meteor.Payment) => p.amount)
    .reduce((a: number, b: number) => $(a).plus(b).valueOf(), 0);

  const remainingPayments = remittances.filter((p: Meteor.Payment) => !['paid', 'pending'].includes(p.status));

  const remainingAmount = remainingPayments
    .map((p: Meteor.Payment) => p.amount)
    .reduce((a: number, b: number) => $(a).plus(b).valueOf(), 0);

  const remainingPrincipal = remainingPayments
    .map((p: Meteor.Payment) => p.principal)
    .reduce((a: number, b: number) => $(a).plus(b).valueOf(), 0);

  const remainingFee = remainingPayments
    .map((p: Meteor.Payment) => p.fee)
    .reduce((a: number, b: number) => $(a).plus(b).valueOf(), 0);

  const newPaymentsExtraCount = Math.round(remainingAmount / weeklyAmountToPay);

  let newPaymentsArray = remittances.filter((p: Meteor.Payment) => ['paid', 'pending'].includes(p.status));

  if (isAdjustRemaining) {
    const principalInstallments = GetInstallments(deal.amount, payments.length);
    const principalInstallmentsAvg = CalculateAmountAvg(payments.length, principalInstallments, deal.feeAmount);

    const { unPaidPayments, paidPayments } = payments.reduce(
      (acc, p) => {
        if (p.status === 'paid') {
          acc.paidPayments.push(p);
        } else {
          acc.unPaidPayments.push(p);
        }
        return acc;
      },
      { unPaidPayments: [] as Meteor.Payment[], paidPayments: [] as Meteor.Payment[] }
    );

    const totalAmount = unPaidPayments.reduce((a: number, b: Meteor.Payment) => $(a).plus(b.amount).valueOf(), 0);

    const amountPaid = paidPayments.reduce((a, b) => $(a).plus(b.amount).valueOf(), 0);

    const totalFeeAmount = deal.amount * (deal.fee + 1) - amountPaid;

    if (Math.round(totalAmount) !== Math.round(totalFeeAmount)) {
      throw new Meteor.Error('TOTAL_AMOUNT_DOESNT_MATCH', `${totalAmount} !== ${totalFeeAmount}`);
    }

    payments.forEach((_, index) => {
      const newFeePerPayment = $(principalInstallmentsAvg).minus(principalInstallments[index]).valueOf();

      payments[index].fee = newFeePerPayment;
      payments[index].principal = $(payments[index].amount).minus(newFeePerPayment).valueOf();
    });

    const totalFee = payments.reduce((a: number, b: Meteor.Payment) => $(a).plus(b.fee).valueOf(), 0);

    const diff = $(deal.feeAmount).minus(totalFee).valueOf();

    payments[0].fee = $(payments[0].fee).plus(diff).valueOf();
    payments[0].principal = $(payments[0].amount).minus(payments[0].fee).valueOf();
  }

  const arrayPayments = isAdjustRemaining
    ? payments.filter((p) => !['paid', 'pending'].includes(p.status))
    : GetArrayPayments({
      dealAmount: remainingPrincipal,
      numberOfPayments: newPaymentsExtraCount,
      feeAmount: remainingFee,
      paymentDate: null,
      isReadjusting: true,
      firstDate,
      isBiweekly
    });

  newPaymentsArray = [...newPaymentsArray, ...arrayPayments].map((p, i) => ({
    ...p,
    number: i + 1
  })) as Meteor.Payment[];

  const totalAmountFromNewPymntArray = newPaymentsArray
    .map((p) => p.amount)
    .reduce((a, b) => $(a).plus(b).valueOf(), 0);

  if (Math.round(totalAmountFromNewPymntArray) !== Math.round(totalAmountFromOldPymntArray)) {
    throw new Meteor.Error(
      `TOTALAMOUNTS_DOESNT_MATCH ${totalAmountFromNewPymntArray}, ${totalAmountFromOldPymntArray}`
    );
  }

  const oldData = remittances.map((p: Meteor.Payment) => {
    const data: Meteor.DataChangesLogs_payment = { ...p };
    return data;
  });

  const newData = newPaymentsArray.map((p: Meteor.Payment) => {
    const data: Meteor.DataChangesLogs_payment = { ...p };
    return data;
  });

  insertDataChangesLog({
    where: 'deals',
    documentID: deal._id,
    operation: 'update',
    method: 'readjustPayments',
    createdBy: Meteor.userId() ?? '',
    old_data: oldData,
    new_data: newData
  });

  Deals.update(
    { _id: id },
    {
      $set: {
        isBiweekly,
        payments: newPaymentsArray,
        readjustedPayments: new Date()
      },
      $inc: { readjustedCount: 1 }
    }
  );

  await setDateInOverdueInDeal(deal._id);

  Meteor.call(
    'notes.insert',
    { message: isBiweekly ? 'REMITTANCE BIWEEKLY' : 'REMITTANCE  REARRANGEMENT', where: 'user', userId: deal.userId },
    true
  );

  return true;
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.readjustPayments'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: readjustPayments
});
