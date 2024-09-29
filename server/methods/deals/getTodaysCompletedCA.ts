import { Meteor } from 'meteor/meteor';
import { endOfDay, startOfDay } from 'date-fns';
import Security from '../../utils/security';
import Deals from '../../collections/deals';

Meteor.methods({
  'deals.getTodaysCompletedCA': async function getTodaysCompletedCA() {
    Security.checkLoggedIn(this.userId);
    this.unblock();

    const pipeline = [
      {
        $match: {
          status: 'completed',
          completeAt: {
            $gte: startOfDay(new Date()),
            $lte: endOfDay(new Date())
          }
        }
      }, {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $addFields: { customer: { $arrayElemAt: ['$customer', 0] } }, },
      {
        $project: {
          _id: 1,
          userId: 1,
          completeAt: 1,
          amount: 1,
          payments: 1,
          'customer.firstName': '$customer.firstName',
          'customer.lastName': '$customer.lastName',
          'customer.currentCashAdvance': '$customer.currentCashAdvance',
        }
      }];

    return await Deals.rawCollection().aggregate(pipeline).toArray();
  },
  'deals.getTodaysCompletedCACount': function getTodaysCompletedCA() {
    Security.checkLoggedIn(this.userId);
    return Deals.find({
      status: 'completed',
      completeAt: {
        $gte: startOfDay(new Date()),
        $lte: endOfDay(new Date())
      }
    }).fetch().length;
  }
});
