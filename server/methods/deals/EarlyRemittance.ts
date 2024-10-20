/* eslint-disable @typescript-eslint/no-explicit-any */
import { Meteor } from 'meteor/meteor';

import { check } from 'meteor/check';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error

import { $ } from 'moneysafe';
import Deals from '../../collections/deals';

import { insertDataChangesLog } from '../../dataChangesLogs';
import insertLog from '../logs/insertGenericLog';

import { sendRemittanceEmailWithAttachment } from '../../../server/emails/emails';
import { startOfDay, setHours, isSaturday } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import initiatePayment from './initiatePayment/initiatePayment';
import { PAYMENT_STATUS } from '../../consts/paymentStatus';
interface GroupPaymentsArguments {
  id: string;
  paymentsToGroup: number[];
  groupDate: Date;
  user: any;
  remittanceDetails: any;
  signatureBase64: string;
}

function ifSaturday(date: Date): boolean {
  if (isSaturday(date)) {
    return true;
  }
  return false;
}
// eslint-disable-next-line @typescript-eslint/require-await
export async function groupPayments({
  id,
  paymentsToGroup,
  groupDate,
  user,
  remittanceDetails,
  signatureBase64
}: GroupPaymentsArguments): Promise<boolean> {
  check(id, String);
  check(paymentsToGroup, Array);
  check(groupDate, Date);

  groupDate = setHours(new Date(groupDate), 12);

  const timeZone = 'America/New_York';
  if (ifSaturday(groupDate)) {
    throw new Meteor.Error(`You cannot group payments at this hour`);
  }
  const deal = Deals.findOne({ _id: id });
  if (deal === undefined) {
    throw new Meteor.Error(`[groupPayments] [${id}]: DEAL_NOT_FOUND`);
  }

  const remittances = deal.payments;

  if (remittances.some((p) => paymentsToGroup.includes(p.number) && p.status === 'paid')) {
    throw new Meteor.Error('CANNOT_GROUP_PAID_PAYMENTS', 'Cannot group payments that are already paid.');
  }

  const paymentsToAdjust = remittances.filter((p) => paymentsToGroup.includes(p.number));
  if (paymentsToAdjust.length === 0) {
    throw new Meteor.Error('NO_PAYMENTS_TO_GROUP');
  }

  const today = startOfDay(utcToZonedTime(new Date(), timeZone));
  const status = PAYMENT_STATUS.SCHEDULE;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const totalAmount = paymentsToAdjust.map((p) => p.amount).reduce((a, b) => $(a).plus(b).valueOf(), 0);

  const groupedPayment: Meteor.Payment = {
    ...paymentsToAdjust[0],
    date: groupDate,
    amount: totalAmount,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    principal: paymentsToAdjust.reduce((a, b) => $(a).plus(b.principal).valueOf(), 0),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    fee: paymentsToAdjust.reduce((a, b) => $(a).plus(b.fee).valueOf(), 0),
    number: paymentsToGroup[0],
    status,
    isGrouped: true
  };

  const updatedPayments = remittances
    .filter((p) => !paymentsToGroup.includes(p.number))
    .concat(groupedPayment)
    .sort((a, b) => a.number - b.number);

  Deals.update(
    { _id: id },
    {
      $set: {
        payments: updatedPayments
      }
    }
  );

  const oldData = remittances.map((p: Meteor.Payment) => ({ ...p }));
  const newData = updatedPayments.map((p: Meteor.Payment) => ({ ...p }));

  insertDataChangesLog({
    where: 'deals',
    documentID: deal._id,
    operation: 'update',
    method: 'groupPayments',
    createdBy: Meteor.userId() ?? '',
    old_data: oldData,
    new_data: newData
  });

  // Formato de la nota para el log
  const paymentNumbers = paymentsToGroup.join(', ');
  const logMessage = `The customer grouped remittances ${paymentNumbers} to the date ${groupDate.toLocaleDateString(
    'en-US'
  )}`;

  insertLog(deal.userId, logMessage);

  if (groupDate.toDateString() === today.toDateString()) {
    const paymentToInitiate = paymentsToGroup[0];
    const paymentInfo = updatedPayments.find((e) => e.number === paymentToInitiate)?.idempotencyKey;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await initiatePayment(deal._id, paymentToInitiate, paymentInfo, null, true);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  sendRemittanceEmailWithAttachment(user, remittanceDetails, signatureBase64);

  return true;
}
const method = {
  type: 'method',
  name: 'deals.groupPayments'
};
DDPRateLimiter.addRule(method, 1, 500);

Meteor.methods({
  [method.name]: groupPayments
});
