import { Meteor } from 'meteor/meteor';
import Deals from '../../../collections/deals';

export const orderPayments = async (dealId: string): Promise<void> => {
  const deal = await Deals.findOneAsync({ _id: dealId });

  if (!deal) throw new Meteor.Error('DEAL NOT FOUND');

  const orderedPayments = deal.payments
    .slice()
    .sort(
      (firstPayment, secondPayment) => new Date(firstPayment.date).valueOf() - new Date(secondPayment.date).valueOf()
    )
    .map((payment, index) => ({
      ...payment,
      number: index + 1
    }));

  await Deals.updateAsync(
    { _id: dealId },
    {
      $set: {
        payments: orderedPayments
      }
    }
  );
};
