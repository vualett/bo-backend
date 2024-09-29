import { startOfDay, subHours } from 'date-fns';
import Deals from '../../collections/deals';

export default async function todaysCA() {
  const _query = {
    status: { $in: ['requested', 'active', 'approved'] },
    createdAt: { $gte: startOfDay(subHours(new Date(), 2)) }
  };

  return Deals.find(_query, { fields: { createdAt: 1 } }).count();
}
