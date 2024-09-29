/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Meteor } from 'meteor/meteor';
import { isPast, differenceInCalendarISOWeeks } from 'date-fns';
import Deals from '../collections/deals';
import Security from '../utils/security';

Meteor.methods({
  async getDealsToWriteoff() {
    this.unblock();
    Security.checkIfAdmin(this.userId);
    const pipeline = [
      {
        $match: {
          status: { $in: ['active', 'suspended'] },
          activateAt: {
            $gte: new Date('2018/01/01'),
            $lt: new Date('2020/01/01')
          }
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
        $addFields: {
          customer: { $arrayElemAt: ['$customer', 0] }
        }
      }
    ];

    const result = await Deals.rawCollection().aggregate(pipeline).toArray();

    const mapped = result.map((d) => {
      const capitalPerPayment = d.amount / d.numberOfPayments;

      const paidPayments = d.payments.filter((p) => p.status === 'paid');

      const overduePayments = d.payments
        .filter((p) => p.status !== 'paid' && p.status !== 'pending')
        .filter((p) => isPast(new Date(p.originalDate || p.date)))
        .map((p) => ({
          ...p,
          principal: capitalPerPayment,
          weeksInOverdue: differenceInCalendarISOWeeks(new Date(), new Date(p.originalDate || p.date))
        }))
        .sort((a, b) => b.weeksInOverdue - a.weeksInOverdue);

      const olderPayment = overduePayments[0];
      const olderPaymentAge = overduePayments.length > 0 ? olderPayment.weeksInOverdue : 0;

      const pendingCapital = overduePayments.map((p) => p.principal).reduce((a, b) => a + b, 0);
      const paidAmount = paidPayments.map((p) => p.amount).reduce((a, b) => a + b, 0);
      return {
        ...d,
        olderPayment,
        olderPaymentAge,
        pendingCapital,
        paidAmount
      };
    });

    const filtered = mapped.filter((d) => d.olderPaymentAge >= 40);

    const count = filtered.length;
    const totalAmount = filtered.map((d) => d.amount).reduce((a, b) => a + b, 0);

    const pendingCapital = filtered.map((d) => d.pendingCapital).reduce((a, b) => a + b, 0);

    const paidAmount = filtered.map((d) => d.paidAmount).reduce((a, b) => a + b, 0);

    return {
      count,
      totalAmount,
      pendingCapital,
      paidAmount,
      deals: filtered.sort((a, b) => b.activateAt - a.activateAt)
    };
  }
});
