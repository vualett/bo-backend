import { isAfter } from 'date-fns';
import { Meteor } from 'meteor/meteor';

enum PaymentStatus {
  PAID = 'paid',
  INITIATED = 'initiated',
  RESCHEDULED = 'rescheduled',
  DECLINED = 'declined',
  PENDING = 'pending'
}

export interface Payment {
  amount: number;
  status: PaymentStatus;
  number: number;
  date: Date;
  skip?: boolean;
}

const groupPaymentsByMonth = (payments: Payment[]): Record<number, Payment[]> => {
  return payments.reduce(
    (
      months: {
        [key: number]: Payment[];
      },
      payment
    ) => {
      const month = payment.date.getMonth();
      months[month] ??= [];
      months[month].push(payment);

      return months;
    },
    {}
  );
};

const calculateMonthlyTotal = (payments: Payment[]): number => {
  return payments.reduce((sum, payment) => sum + payment.amount, 0);
};

export const getMaxMonthlyPayment = (payments: Payment[]): number => {
  const paymentsByMonth = groupPaymentsByMonth(payments);
  const monthlyTotals = Object.values(paymentsByMonth).map(calculateMonthlyTotal);
  return Math.max(...monthlyTotals, 0);
};

export const isDealInOverdue = (payments: Meteor.Payment[]): boolean => {
  const CURRENT_DATE = new Date();

  return payments.some(
    ({ status, date: limitDateToPaid, skip }) =>
      status !== PaymentStatus.PAID &&
      status !== PaymentStatus.PENDING &&
      !skip &&
      isAfter(CURRENT_DATE, limitDateToPaid)
  );
};
