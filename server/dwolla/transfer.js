import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import numeral from 'numeral';
import Dwolla from './dwolla';
import { DWOLLA_FUNDING_SOURCES } from '../keys';

const DESTINATION_FUNDING_SOURCES = DWOLLA_FUNDING_SOURCES;

export default async function dwollaTransfer(transfer) {
  const { direction, fundingUrl, amount, metadata, idempotencyKey, RTPEnabled, clearing } = transfer;

  check(direction, String);
  check(fundingUrl, String);
  check(amount, Number);
  check(metadata, Object);
  check(idempotencyKey, String);



  if (!metadata.dealId) throw new Meteor.Error('NOT_DEALID_IN_METADATA');
  if (amount > 5000) throw new Meteor.Error('Amount Limit exceed');

  const amountToTransfer = numeral(amount).format('0.00');

  const requestBody = {
    _links: {
      source: { href: fundingUrl },
      destination: { href: DESTINATION_FUNDING_SOURCES }
    },
    amount: {
      currency: 'USD',
      value: amountToTransfer
    },
    clearing: clearing || { source: 'standard', destination: 'next-available' },
    metadata
  };

  if (direction === 'out') {
    requestBody._links.source.href = DWOLLA_FUNDING_SOURCES;
    requestBody._links.destination.href = fundingUrl;
    requestBody.clearing.destination = 'next-available';

    if (RTPEnabled) {
      requestBody.processingChannel = {
        destination: 'real-time-payments'
      };
    }
  }

  return Dwolla()
    .post('transfers', requestBody, { 'Idempotency-Key': idempotencyKey })
    .then((res) => res.headers.get('location'));
}
