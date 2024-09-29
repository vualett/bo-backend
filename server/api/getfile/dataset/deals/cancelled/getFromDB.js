import Deals from '../../../../../collections/deals';
import pipeline from './pipeline';
import pipeline2 from './pipeline2';

export default async function getFromDB(dates) {
  const completedDeals = await Deals.rawCollection().aggregate(pipeline(dates)).toArray();

  const failedDeals = await Deals.rawCollection().aggregate(pipeline2(dates)).toArray();

  const all = [...completedDeals, ...failedDeals].sort((a, b) => a.activateAt - b.activateAt);

  return all;
}
