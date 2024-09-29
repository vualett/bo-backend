import getTransfers from './getTransfers';

export default async function checkForNonFailedDeposits(dwollaCustomerURL, deal) {
  const lastTransfer = await getTransfers(dwollaCustomerURL);

  if (lastTransfer.length > 0) {
    const { status, amount } = lastTransfer[0];

    if (status !== 'failed') {
      if (Number(amount.value) === Number(deal.amount)) {
        throw new Meteor.Error('DUPLICATE_TRANSFER');
      }
    }
  }
}
