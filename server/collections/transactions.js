import { Mongo } from 'meteor/mongo';

export const Transactions = new Mongo.Collection('transactions', {
  transform: (doc) => ({
    ...doc,
    isDebit: () => doc.type === 'debit',
    isCollection: () => doc.reason === 'ca_collection',
    isCaDeposit: () => doc.reason === 'ca_deposit'
  })
});

export default Transactions;
