import { addDays, subDays } from 'date-fns';

const CA = {
  product_name: 'CA700WEEKLY#10@0.26',
  status: 'active',
  amount: 700,
  fee: 0.26,
  numberOfPayments: 10,
  termsOfPayment: 'weekly',
  isDemo: true,
  payments: [
    {
      status: 'paid',
      number: 1,
      date: subDays(new Date(), 21),
      amount: 88.2
    },
    {
      status: 'paid',
      number: 2,
      date: subDays(new Date(), 14),
      amount: 88.2
    },
    {
      status: 'paid',
      number: 3,
      date: subDays(new Date(), 7),
      amount: 88.2
    },
    {
      status: 'schedule',
      number: 4,
      date: addDays(new Date(), 7),
      amount: 88.2
    },
    {
      status: 'schedule',
      number: 5,
      date: addDays(new Date(), 14),
      amount: 88.2
    },
    {
      status: 'schedule',
      number: 6,
      date: addDays(new Date(), 21),
      amount: 88.2
    },
    {
      status: 'schedule',
      number: 7,
      date: addDays(new Date(), 28),
      amount: 88.2
    },
    {
      status: 'schedule',
      number: 8,
      date: addDays(new Date(), 35),
      amount: 88.2
    },
    {
      status: 'schedule',
      number: 9,
      date: addDays(new Date(), 42),
      amount: 88.2
    },
    {
      status: 'schedule',
      number: 10,
      date: addDays(new Date(), 49),
      amount: 88.2
    }
  ],
  createdAt: subDays(new Date(), 21),
  preApprovedAt: subDays(new Date(), 22),
  modifiedAt: new Date(),
  approvedAt: subDays(new Date(), 23),
  transferUrl: 'https://sandbox.dwolla.com/transfers/demo',
  activateAt: subDays(new Date(), 24)
};

export default CA;
