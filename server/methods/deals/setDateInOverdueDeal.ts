/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import Deals from '../../collections/deals';
import { addDays, min } from 'date-fns';

export async function setDateInOverdueInDeal(dealID: string): Promise<boolean> {
  const deal = await Deals.findOneAsync({ _id: dealID });

  if (!deal) return false;

  const noPaidPayments = deal.payments.filter((p) => p.status !== 'paid');

  if (!noPaidPayments.length) {
    return false;
  }

  const nextNoPaidPaymentDate = min(
    noPaidPayments.map((p) => {
      if (p.status !== 'schedule') {
        return p?.initiatedAt ?? p.date;
      }
      return p.date;
    })
  );

  const dayOfWeek = nextNoPaidPaymentDate.getDay();
  let extraDays = 4;
  if (dayOfWeek > 2) {
    extraDays = 6;
  }

  await Deals.updateAsync(
    { _id: deal._id },
    {
      $set: {
        dateInOverdue: addDays(nextNoPaidPaymentDate, extraDays)
      }
    }
  );
  return true;
}
