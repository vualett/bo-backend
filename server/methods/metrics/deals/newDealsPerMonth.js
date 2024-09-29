import { Meteor } from 'meteor/meteor';
import { subMonths, startOfDay } from 'date-fns';
import Deals from '../../../collections/deals';
import Security from '../../../utils/security';

Meteor.methods({
  'metrics.newDealsPerMonth': async function ({ endDate, startDate }) {
    Security.checkIfAdmin(this.userId);
    let _endDate = endDate ? new Date(endDate) : subMonths(startOfDay(new Date()), 1);
    let _startDate = startDate ? new Date(startDate) : subMonths(_endDate, 11);

    const pipeline = [
      {
        $match: {
          status: {
            $in: ['approved', 'active', 'completed']
          },
          approvedAt: {
            $gte: _startDate,
            $lt: _endDate
          }
        }
      },
      {
        $group: {
          _id: {
            year: {
              $year: '$approvedAt'
            },
            month: {
              $month: '$approvedAt'
            },
            firstDeal: '$firstDeal'
          },
          count: {
            $sum: 1
          },
          totalAmount: {
            $sum: '$amount'
          }
        }
      }
    ];

    const dealsPerMonth = await Deals.rawCollection().aggregate(pipeline).toArray();

    const dealsPerMonthSorted = dealsPerMonth
      .map((month) => ({
        ...month,
        date: new Date(month._id.year, month._id.month)
      }))
      .sort(function (a, b) {
        return new Date(a.date) - new Date(b.date);
      });

    const newDealsPerMonth = dealsPerMonthSorted.filter((month) => month._id.firstDeal);
    const repeatingDealsPerMonth = dealsPerMonthSorted.filter((month) => !month._id.firstDeal);

    const newDealsPerMonthFormatted = newDealsPerMonth.map((month, i) => ({
      ...month,
      growthPct: month.count / repeatingDealsPerMonth[i].count
    }));

    return newDealsPerMonthFormatted;
  }
});
