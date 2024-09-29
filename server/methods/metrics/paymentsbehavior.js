import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import { groupBy } from '../../utils/utils';

const pipeline = [
  {
    $match: {
      status: { $in: ['active', 'completed', 'suspended'] },
      metrics: { $exists: true }
    }
  },
  {
    $lookup: {
      from: Meteor.users._name,
      localField: 'userId',
      foreignField: '_id',
      as: 'customer'
    }
  },
  {
    $project: {
      status: 1,
      amount: 1,
      metrics: 1,
      createdAt: 1,
      numberOfPayments: 1,
      customer: { $arrayElemAt: ['$customer', 0] }
    }
  },
  {
    $project: {
      status: 1,
      amount: 1,
      metrics: 1,
      createdAt: 1,
      numberOfPayments: 1,
      state: '$customer.address.state'
    }
  },
  { $sort: { createdAt: -1 } },
  { $limit: 10000 }
];

export default async function paymentsBehavior() {
  const cashAdvances = await Deals.rawCollection()
    .aggregate(pipeline, {
      allowDiskUse: true
    })
    .toArray();

  const byState = Object.values(groupBy(cashAdvances, 'state'))
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);

  const byAmount = Object.values(groupBy(cashAdvances, 'amount')).sort((a, b) => b.amount - a.amount);

  const byProduct = byAmount.map((a) => ({
    amount: a[0].amount,
    count: a.length,
    grouped: Object.values(groupBy(a, 'numberOfPayments')).map((g) => ({
      weeks: g[0].numberOfPayments,
      count: g.length,
      regular: (() => {
        const filtered = g
          .filter((ca) => ca.metrics)
          .filter((ca) => ca.metrics.failedPayments === 0 && ca.metrics.failedPayments === 0);
        return {
          count: filtered.length,
          percentage: Number((filtered.length / g.length) * 100).toFixed(2)
        };
      })()
    }))
  }));

  const _without = cashAdvances
    .filter((ca) => ca.metrics)
    .filter((ca) => ca.metrics.failedPayments === 0 && ca.metrics.failedPayments === 0);

  const _withPaymentsDeclined = cashAdvances.filter((ca) => ca.metrics).filter((ca) => ca.metrics.failedPayments > 0);

  const _withRescheduledPayments = cashAdvances
    .filter((ca) => ca.metrics)
    .filter((ca) => ca.metrics.rescheduledPayments > 0);

  const grouped = {
    state: byState.map((a) => ({
      state: a[0].state,
      count: a.length,
      normal: {
        count: a
          .filter((ca) => ca.metrics)
          .filter((ca) => ca.metrics.failedPayments === 0 && ca.metrics.failedPayments === 0).length
      },
      withDeclines: {
        count: a.filter((ca) => ca.metrics).filter((ca) => ca.metrics.failedPayments > 0).length
      },
      withReschedulings: {
        count: a.filter((ca) => ca.metrics).filter((ca) => ca.metrics.rescheduledPayments > 0).length
      }
    })),
    amount: byAmount.map((a) => ({
      amount: a[0].amount,
      count: a.length
    }))
  };

  return {
    all: { count: cashAdvances.length },
    normal: { count: _without.length },
    withDeclines: { count: _withPaymentsDeclined.length },
    withReschedulings: { count: _withRescheduledPayments.length },
    grouped,
    byAmount,
    byProduct
  };
}
