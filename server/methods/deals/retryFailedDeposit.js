import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import dwollaTransferOut from '../../dwolla/transferOut';
import Security from '../../utils/security';
import Deals from '../../collections/deals';
import checkForNonFailedDeposits from '../../dwolla/checkForNonFailedDeposits';
import logger from '../../logger/log';
import getFundingSource from '../../dwolla/getFundingSource';
import { Random } from 'meteor/random';
import * as Sentry from '@sentry/node';
async function isRTPEnabled(User) {
  const { _id, metrics, dwollaFundingURL } = User;
  if (!dwollaFundingURL) return false;
  const fundingSource = await getFundingSource(dwollaFundingURL);
  if (!fundingSource?.channels) return false;
  Meteor.users.update(
    { _id },
    {
      $set: {
        'bankAccount.channels': fundingSource.channels
      }
    }
  );
  if (fundingSource.channels.includes('real-time-payments')) {
    if (metrics.cashAdvances.count > 0) return true;
  }
  return false;
}

function checkCashAdvance(_deal) {
  if (_deal.status === 'active') throw new Meteor.Error('TRANSFER_INITIATED');
}

async function retryFailedDeposit(dealID, paymentMethod) {
  check(dealID, String);
  if (!Security.hasAllRoles(Meteor.userId(), ['admin', 'financial', 'manager', 'validation', 'riskProfile'])) {
    throw new Meteor.Error('NOT_AUTHORIZED', 'You are not authorized');
  }

  try {
    const Deal = Deals.findOne({ _id: dealID });
    const User = Meteor.users.findOne({ _id: Deal.userId });

    checkCashAdvance(Deal);

    await checkForNonFailedDeposits(User.dwollaCustomerURL, Deal);

    const transferMetadata = {
      dealId: Deal._id,
      userId: User._id,
      transferReason: 'cash_advance_transfer'
    };

    const approvedAt = new Date();

    const RTPEnabled = await isRTPEnabled(User);

    const _paymentMethod = ['ach'].includes(paymentMethod) ? false : RTPEnabled;

    const newIdempotencyKey = Random.id();

    const transferUrl = await dwollaTransferOut(
      User.dwollaFundingURL,
      Deal.amount,
      transferMetadata,
      newIdempotencyKey,
      _paymentMethod
    );

    const set = {
      approvedAt,
      preApprovedAt: approvedAt,
      transferUrl,
      transferChannel: _paymentMethod ? 'RTP' : 'ACH',
      idempotencyKey: newIdempotencyKey
    };

    Deals.update({ _id: dealID }, { $set: set });

    Meteor.users.update(
      { _id: Deal.userId },
      {
        $set: {
          'currentCashAdvance.preApprovedAt': set.approvedAt,
          'currentCashAdvance.approvedAt': set.approvedAt
        }
      }
    );
  } catch (error) {
    Sentry.captureException(error);
    if (error.body && error.body._embedded && error.body._embedded.errors) {
      throw new Meteor.Error(error.body._embedded.errors[0].message);
    }

    if (error.error) throw new Meteor.Error(error.error);

    logger.error(`deals.retryFailedDeposit [${dealID}] ${JSON.stringify(error)}`);
    throw new Meteor.Error(error);
  }
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.retryFailedDeposit'
};

DDPRateLimiter.addRule(method, 1, 10000);

Meteor.methods({
  [method.name]: retryFailedDeposit
});
