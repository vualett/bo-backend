import { Meteor } from 'meteor/meteor';
import { startOfDay, endOfDay, subHours } from 'date-fns';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Deals from '../../collections/deals';
import Security from '../../utils/security';

Meteor.publish({
  todaysCashAdvances({ firstdate, lastdate }) {
    let _startDate = startOfDay(new Date());
    let _finalDate = endOfDay(new Date());

    if (firstdate && lastdate) {
      _startDate = new Date(firstdate);
      _finalDate = new Date(lastdate);
    }

    const query = {
      status: { $in: ['requested', 'active', 'approved'] },
      createdAt: { $gte: _startDate, $lte: _finalDate }
    };

    return Deals.find(query, { fields: { createdAt: 1 } });
  }
});

Meteor.methods({
  todaysUsers: () => {
    return Meteor.users
      .find({
        createdAt: { $gte: startOfDay(subHours(new Date(), 2)) }
      })
      .count();
  },
  todaysCashAdvances: async () => {
    Security.checkIfAdmin(this.userId);
    const date = { start: startOfDay(subHours(new Date(), 2)) };

    const pipeline = [
      {
        $match: {
          status: { $in: ['requested', 'active', 'approved'] },
          createdAt: { $gte: date.start }
        }
      },
      {
        $lookup: {
          from: 'deals',
          localField: 'userId',
          foreignField: 'userId',
          as: 'others'
        }
      },
      {
        $project: { createdAt: 1, others: 1 }
      }
    ];

    const result = await Deals.rawCollection().aggregate(pipeline).toArray();

    const repetitions = result.filter((d) => d.others.length >= 2);

    return {
      all: result.length,
      repetitions: repetitions.length
    };
  }
});

DDPRateLimiter.addRule(
  {
    type: 'method',
    name: 'todaysUsers'
  },
  2,
  3000
);

DDPRateLimiter.addRule(
  {
    type: 'method',
    name: 'todaysCashAdvances'
  },
  2,
  5000
);
