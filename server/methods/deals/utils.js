import { max, min, differenceInDays } from 'date-fns';

export function checkIfAllPaymentsPaid(payments, currPaymentNumber) {
  if (currPaymentNumber) {
    return payments.every((p) => p.number === currPaymentNumber || p.status === 'paid');
  }

  return payments.every((p) => p.status === 'paid');
}

export function daysInArreas(deal) {
  const processingOffset = 7;

  const { payments } = deal;
  const hasPaidPayment = payments.filter((payment) => payment.status === 'paid').length > 0;

  const paymentDate = hasPaidPayment
    ? max(payments.map((payment) => payment.paidAt || payment.date))
    : min(payments.map((payment) => payment.date));

  const diff = differenceInDays(new Date(), new Date(paymentDate));

  const daysInArreas = diff - processingOffset;

  if (isNaN(daysInArreas)) {
    console.log(hasPaidPayment, paymentDate);
  }

  return daysInArreas < 0 ? 0 : daysInArreas;
}

export default {
  checkIfAllPaymentsPaid,
  daysInArreas
};
