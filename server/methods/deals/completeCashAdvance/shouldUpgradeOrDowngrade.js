import Deals from '../../../collections/deals';
import insertLog from '../../logs/insertGenericLog';
import checkDealsWellPaid from './checkDealsWellPaid';

import { sendNotification } from '../../../notifications/sendNotification';
import assignAgent from '../../validation/assignAgent';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';
import { Meteor } from 'meteor/meteor';

async function automaticUpgrade(user) {
  // const LIMIT_CASH_ADVANCE = 2;
  // const LIMIT_RESCHEDULE_PAYMENT = 3;
  // const LIMIT_SUSPENDED_CURRENT_YEAR = 0;

  const LIMIT_FAILED_PAYMENTS = 3;

  // const AMOUNT_REQUIRED_T0_UPGRADE = {
  //   micro: 300,
  //   c: 550
  // };

  const automaticUpgradeByCategory = {
    micro: 'c',
    c: 'b',
    b: 'a',
    a: 'a+'
  };

  const userId = user._id;

  if (user.category === 'a') {
    const lastDeal = await Deals.findOne({ userId, status: 'completed' }, { sort: { completeAt: -1 } }, { limit: 1 });
    const sortedDescDeals = await Deals.find(
      { userId, status: 'completed' },
      { sort: { completeAt: -1 } }
    ).fetchAsync();
    const dealsWithAmount1000 = sortedDescDeals.filter((deal) => deal.amount === 1000);

    if (dealsWithAmount1000.length < 2) {
      return;
    }
    if (checkDealsWellPaid([lastDeal], user) === false) return;
  } else {
    const sortedDescDeals = await Deals.find(
      { userId, status: 'completed' },
      { sort: { completeAt: -1 } }
    ).fetchAsync();

    const havePaymentsDeclined = sortedDescDeals
      .slice(0, 2)
      .some(({ metrics }) => metrics.failedPayments >= LIMIT_FAILED_PAYMENTS);

    if (havePaymentsDeclined) return;
  }

  // const notHaveLimitOfCashAdvance =
  //   sortedDescDeals.filter(({ amount }) => amount === AMOUNT_REQUIRED_T0_UPGRADE[user.category]).length <
  //   LIMIT_CASH_ADVANCE;

  // if (notHaveLimitOfCashAdvance) return;

  // const notHaveRescheduled = sortedDescDeals.shift().metrics.rescheduledPayments > LIMIT_RESCHEDULE_PAYMENT;

  // if (notHaveRescheduled) return;

  // if (user.category === newCategory) {
  // const isSuspended = await Timelogs.find({
  //   userId,
  //   'metadata.type': 'suspended',
  //   timestamp: { $gte: new Date(new Date().getFullYear(), 0, 1) }
  // }).fetchAsync();

  // if (isSuspended.length === LIMIT_SUSPENDED_CURRENT_YEAR) {
  // newCategory = 'b';
  // }

  try {
    await sendNotification({
      targetId: userId,
      title: 'Good news!',
      message: 'We are pleased to inform you that the deal amount has been upgraded.'
    });
  } catch (error) {
    const { message } = error;

    logger.error(`notification.sendAutomaticUpgrade[${userId}] ${message}`);
    Sentry.captureException(error, { extra: { userId } });
  }

  return { upOrDown: 'up', newCategory: automaticUpgradeByCategory[user.category] };
}

function suspend(failedPayments, user) {
  failedPayments === 3 && insertLog(user._id, 'SUGGESTION: Downgrade two levels');
  failedPayments === 4 && insertLog(user._id, 'SUGGESTION: Downgrade to MICRO');
  failedPayments >= 5 && insertLog(user._id, 'SUGGESTION: Suspend for 8 weeks');
  return { upOrDown: 'suspend', newCategory: 'suspended' };
}

export function downgrade(category, user) {
  const downgrade = { upOrDown: 'down', newCategory: '' };

  switch (category) {
    case 'b':
      downgrade.newCategory = 'c';
      break;
    case 'a':
      downgrade.newCategory = 'b';
      break;
    case 'a+':
      downgrade.newCategory = 'a';
      break;
    case '2k':
      downgrade.newCategory = 'a+';
      break;
    case '2kw14':
      downgrade.newCategory = 'a+';
      break;
    default:
      insertLog(user._id, 'SUGGESTION: Downgrade one level');
      downgrade.newCategory = category;
      break;
  }

  return downgrade;
}

async function enableUpgrade(user) {
  let meetTheRequirements = false;
  switch (user.category) {
    case 'b': {
      // last 4 deals well paid and at least two of 700
      const deals = Deals.find(
        { userId: user._id, status: 'completed' },
        { sort: { completeAt: -1 }, skip: 1, limit: 4 }
      ).fetch();
      meetTheRequirements =
        checkDealsWellPaid(deals, user) &&
        deals.filter((deal) => deal.amount === 700).length >= 2 &&
        deals.length === 4;
      break;
    }
    case 'a': {
      // last 5 deals well paid and at least 2 - 1000 || 2 - 700 && 1 - 1000
      const deals = Deals.find(
        { userId: user._id, status: 'completed' },
        { sort: { completeAt: -1 }, skip: 1, limit: 5 }
      ).fetch();
      meetTheRequirements =
        checkDealsWellPaid(deals, user) &&
        deals.length === 5 &&
        (deals.filter((deal) => deal.amount === 1000).length >= 2 ||
          (deals.filter((deal) => deal.amount === 700).length >= 2 &&
            deals.filter((deal) => deal.amount === 1000).length >= 1));
      break;
    }
    case 'a+': {
      // last 7 deals well paid
      const deals = Deals.find(
        { userId: user._id, status: 'completed' },
        { sort: { completeAt: -1 }, limit: 7 }
      ).fetch();
      meetTheRequirements = checkDealsWellPaid(deals, user) && deals.length === 7;
      break;
    }
  }
  return meetTheRequirements ? { upOrDown: 'enableUp' } : false;
}

export default async function shouldUpgradeOrDowngrade(
  failedPayments,
  payments,
  user,
  returnCodes,
  isDealExpired,
  totalDeals
) {
  const badPayments = payments.filter((p) => p.declinedAt).map((p) => p.returnCode);
  const returnCodesArray = !!returnCodes && returnCodes.length ? returnCodes : badPayments;

  // Downgrade if 4 or 6  failed payments different from R01
  if (
    ['c', 'b', 'a', 'a+', 'xl', '2k', '2kw14'].includes(user.category) &&
    failedPayments >= 4 &&
    failedPayments <= 6 &&
    !returnCodesArray.every((r) => r === 'R01') === false
  ) {
    if (totalDeals >= 5) {
      return false;
    }
    if (user.category === 'c' || user.category === 'xl') {
      insertLog(user._id, 'the customer have 4 or 6 failed payments and he is in category c or xl');
      Meteor.users.update({ _id: user._id }, { $set: { 'status.verified': false } });
      return assignAgent({
        userId: user._id,
        category: 'validate'
      });
    } else {
      return downgrade(user.category, user._id);
    }
  }
  // Suspend if more than 3 failed payments
  if (failedPayments > 3 && isDealExpired.status === true && isDealExpired.message === 'WeeksPaid is greater than 3') {
    if (totalDeals >= 5) {
      return false;
    }
    return suspend(failedPayments, user._id);
  }

  if (['micro', 'c', 'b', 'a'].includes(user.category)) {
    const result = await automaticUpgrade(user);
    return (
      result ??
      Meteor.users.update(
        { _id: user._id, category: 'micro' },
        { $set: { category: 'none', previousCategory: user.category, 'status.verified': false } }
      )
    );
  }

  // Enable upgrade request
  if (['b', 'a', 'a+'].includes(user.category)) {
    return await enableUpgrade(user);
  }

  return false;
}
