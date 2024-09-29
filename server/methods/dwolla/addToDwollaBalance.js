import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { Random } from 'meteor/random';
import { check } from 'meteor/check';
import Dwolla from '../../dwolla/dwolla';
import Security from '../../utils/security';
import { DWOLLA_BANK_FUNDING_SOURCES, DWOLLA_FUNDING_SOURCES } from '../../keys';

export default async function addToDwollaBalance({ amount, times = 1 }) {
  check(amount, Number);
  check(times, Number);

  if (times > 50 || times < 1) throw new Meteor.Error('Invalid times');
  if (amount > 10000 || amount < 1) throw new Meteor.Error('ERROR_ADDING_TO_DWOLLA_BALANCE');

  const idempotencyKeys = [];

  for (let index = 0; index < times; index++) {
    idempotencyKeys.push(Random.id());
  }

  const requestBody = {
    _links: {
      source: { href: DWOLLA_BANK_FUNDING_SOURCES },
      destination: { href: DWOLLA_FUNDING_SOURCES }
    },
    amount: {
      currency: 'USD',
      value: amount
    },
    clearing: { source: 'next-available' }
  };

  const transfers = [];

  for (const idempotencyKey of idempotencyKeys) {
    const transfer = await Dwolla().post('transfers', requestBody, { 'Idempotency-Key': idempotencyKey });
    transfers.push(transfer);
  }

  return transfers;
}

async function addToDwollaBalanceMethod({ amount, times = 1 }) {
  Security.checkRole(this.userId, ['super-admin']);
  return await addToDwollaBalance({ amount, times });
}
// DEFINING METHOD
const method = {
  type: 'method',
  name: 'dwolla.addToBalance',
  func: addToDwollaBalanceMethod
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: method.func
});
