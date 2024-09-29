import { Meteor } from 'meteor/meteor';
import endOfDay from 'date-fns/endOfDay';
import Deals from '../../collections/deals';
import { flatten } from '../../utils/utils';
import Security from '../../utils/security';

function collectionPerWeek(datesRange) {
  const dates = {
    start: new Date(datesRange.startDate),
    end: endOfDay(datesRange.endDate)
  };

  function transform(doc) {
    const capitalPerPayment = doc.amount / doc.numberOfPayments;

    const payments = doc.payments
      .filter((p) => {
        if (p.initiatedAt) return p.initiatedAt >= p.date;
        return p.date;
      })
      .filter(({ date }) => {
        const _date = new Date(date);
        return _date >= dates.start && _date <= dates.end;
      })
      .map((p) => ({
        ...p,
        cashAdvanceID: doc._id,
        userID: doc.userId,
        fee: p.amount - capitalPerPayment,
        principal: capitalPerPayment,
        dealFee: doc.fee,
        dealAmount: doc.amount
      }));

    return { payments };
  }

  const query = {
    $and: [
      { status: { $in: ['active', 'completed'] } },
      {
        payments: {
          $elemMatch: {
            date: {
              $gte: dates.start,
              $lt: dates.end
            }
          }
        }
      }
    ]
  };

  const deals = Deals.find(query, { transform }).fetch();

  const payments = flatten(deals.map((d) => d.payments));
  return {
    payments
  };
}

Meteor.methods({
  'accounting.expectedCollection': function collectionPerWeekMethod(params) {
    Security.checkIfAdmin(this.userId);
    return collectionPerWeek(params);
  }
});
