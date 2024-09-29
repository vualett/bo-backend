import endOfDay from 'date-fns/endOfDay';
import startOfDay from 'date-fns/startOfDay';
import Deals from '../../collections/deals';
import collection from '../accounting/collection';
import getUalettFundingBalance from '../dwolla/getUalettFundingBalance';
import subWeeks from 'date-fns/subWeeks';
import startOfWeek from 'date-fns/startOfWeek';
import endOfWeek from 'date-fns/endOfWeek';
import { $ } from 'moneysafe';

const activeDealsPipeline = [
  {
    $match: {
      status: 'active'
    }
  },
  {
    $count: 'activeDeals'
  }
];

const todayDealsPipeline = [
  {
    $match: {
      status: { $in: ['active', 'approved', 'requested'] },
      createdAt: {
        $gt: startOfDay(new Date()),
        $lt: endOfDay(new Date())
      }
    }
  },
  {
    $count: 'todayDeals'
  }
];

export default async function generalMetrics() {
  const activeDeals = await Deals.rawCollection().aggregate(activeDealsPipeline).toArray();

  const todayDeals = await Deals.rawCollection().aggregate(todayDealsPipeline).toArray();

  const dwollaBalance = await getUalettFundingBalance();

  const _collection = collection({
    startDate: startOfWeek(subWeeks(new Date(), 1)),
    endDate: endOfWeek(subWeeks(new Date(), 1))
  });

  return {
    activeDeals: activeDeals.length ? activeDeals[0].activeDeals : null,
    todayDeals: todayDeals.length ? todayDeals[0].todayDeals : null,
    dwollaBalance: dwollaBalance.balance,
    processed: $(_collection?.paid?.principal).plus(_collection?.paid?.fee).valueOf(),
    processedRange: {
      startDate: startOfWeek(subWeeks(new Date(), 1)),
      endDate: endOfWeek(subWeeks(new Date(), 1))
    }
  };
}
