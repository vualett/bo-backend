import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { Random } from 'meteor/random';
import { check } from 'meteor/check';
import Dwolla from '../../dwolla/dwolla';
import Security from '../../utils/security';
import { DWOLLA_BANK_FUNDING_SOURCES, DWOLLA_FUNDING_SOURCES } from '../../keys';
import chunkBy from '../../utils/chunkBy';

const ACH_LIMIT = 100000;

function makeTransfer({ amount }) {

  if (amount > ACH_LIMIT || amount < 1) throw new Meteor.Error('ERROR_ADDING_TO_DWOLLA_BALANCE');

  const idempotencyKey = Random.id();

  const requestBody = {
    _links: {
      source: { href: DWOLLA_FUNDING_SOURCES },
      destination: { href: DWOLLA_BANK_FUNDING_SOURCES }
    },
    amount: {
      currency: 'USD',
      value: amount
    },
    clearing: { destination: 'next-available' }
  };

  return Dwolla().post('transfers', requestBody, { 'Idempotency-Key': idempotencyKey });
};

export async function transferToBank({ amount }) {
  try {
    check(amount, Number);

    const chunks = chunkBy(ACH_LIMIT)(amount);
    const results = [];

    for (const chunk of chunks) {
      const transfer = await makeTransfer({ amount: chunk });
      results.push(transfer);
    }

    return results;
  } catch (error) {
    throw new Meteor.Error(error);
  }
}

async function transferToBankMethod({ amount }) {
  Security.checkRole(this.userId, ['super-admin']);
  return await transferToBank({ amount });
}
// DEFINING METHOD
const method = {
  type: 'method',
  name: 'dwolla.transferToBank',
  func: transferToBankMethod
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: method.func
});
