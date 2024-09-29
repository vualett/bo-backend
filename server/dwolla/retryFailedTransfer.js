import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import numeral from 'numeral';
import Dwolla from './dwolla';
import Deals from '../collections/deals';
import getTransfer from './getTransfer';
import { Random } from 'meteor/random';
import Security from '../utils/security';
import checkForDuplicateDeposit from './checkForDuplicateDeposit';
import { DWOLLA_FUNDING_SOURCES } from '../keys';

const checkIfTransferFailed = (url) => {
  const currentTransfer = getTransfer(url);
  if (currentTransfer.status === 'failed') return true;
  return false;
};

export default async function retryDwollaTransfer({ dealId, channel, forceDuplicate }) {
  Security.hasRole(Meteor.userId(), ['technical']);
  check(dealId, String);
  check(channel, String);

  if (!['rtp', 'ach'].includes(channel)) throw new Meteor.Error('Invalid Channel');

  const deal = await Deals.findOne({ _id: dealId });

  if (!deal) throw new Meteor.Error('No Deal Found');

  const { userId, amount, transferUrl, status } = deal;

  // Check deal status
  if (status !== 'requested') throw new Meteor.Error('Deal Is Not On Requested Status');

  const user = Meteor.users.findOne({ _id: userId });

  if (!user) throw new Meteor.Error('No User Found');

  const { dwollaCustomerURL } = user;

  // Check if previous transfer failed
  const currentTransferFailed = checkIfTransferFailed(transferUrl);

  if (!currentTransferFailed) throw new Meteor.Error('Current Transfer Not Failed');

  // Check if customer does not have previous transfer
  if (!forceDuplicate) await checkForDuplicateDeposit(dwollaCustomerURL, deal);

  // Update deal Idempotency-key
  const newIdempotencyKey = Random.id();

  const metadata = {
    dealId,
    userId,
    transferReason: 'cash_advance_transfer'
  };

  const header = { 'Idempotency-Key': newIdempotencyKey };

  if (amount > 3000) throw new Meteor.Error('Amount Limit exceed');

  const amountToTransfer = numeral(amount).format('0.00');

  const requestBody = {
    _links: {
      source: { href: DWOLLA_FUNDING_SOURCES },
      destination: { href: dwollaCustomerURL }
    },
    amount: {
      currency: 'USD',
      value: amountToTransfer
    },
    clearing: { destination: 'next-available' },
    metadata
  };

  if (channel === 'rtp') {
    requestBody.processingChannel = {
      destination: 'real-time-payments'
    };
  }

  const newTransferUrl = Dwolla()
    .post('transfers', requestBody, header)
    .then((res) => res.headers.get('location'));

  Deals.update(
    { _id: dealId },
    {
      $set: {
        idempotencyKey: newIdempotencyKey,
        transferUrl: newTransferUrl
      },
      $addToSet: {
        previousTransferUrls: {
          url: transferUrl,
          date: new Date()
        }
      }
    }
  );

  return true;
}
