import { Meteor } from 'meteor/meteor';
import { startOfDay, subDays, endOfDay } from 'date-fns';
import Invitations from '../../collections/invitations';
import { groupBy } from '../../utils/utils';
import Deals from '../../collections/deals';

export default function daily() {
  const usersCount = Meteor.users.find({ type: 'user' }).count();

  const cashAdvances = Deals.find({
    $and: [
      {
        $or: [{ status: 'active' }, { status: 'approved' }]
      },
      {
        approvedAt: {
          $gte: subDays(startOfDay(new Date()), 1),
          $lt: subDays(endOfDay(new Date()), 1)
        }
      }
    ]
  }).fetch();

  const allCashAdvancesActive = Deals.find({
    $and: [
      { status: 'active' },
      {
        approvedAt: {
          $lt: subDays(endOfDay(new Date()), 1)
        }
      }
    ]
  }).fetch();

  const cashAdvancesByAmount = groupBy(cashAdvances, 'amount');

  const usersRepeating = Meteor.users.find({ type: 'user', 'metrics.cashAdvances.count': { $gt: 1 } }).count();
  const usersRepeatingMoreThanTwo = Meteor.users
    .find({ type: 'user', 'metrics.cashAdvances.count': { $gt: 2 } })
    .count();

  const completedCashAdvances = Deals.find({
    status: 'completed'
  }).fetch();

  const invitationsCount = Invitations.find({
    $and: [
      { used: { $eq: false } },
      { notInterested: { $not: { $eq: true } } },
      {
        when: {
          $gte: subDays(startOfDay(new Date()), 3),
          $lt: endOfDay(new Date())
        }
      }
    ]
  }).count();

  return {
    usersCount,
    invitationsCount,
    cashAdvancesByAmount,
    activeCashAdvances: {
      count: allCashAdvancesActive.length,
      total: allCashAdvancesActive.map((ca) => ca.amount).reduce((a, b) => a + b, 0)
    },
    completed: {
      count: completedCashAdvances.length,
      total: completedCashAdvances.map((ca) => ca.amount).reduce((a, b) => a + b, 0)
    },
    usersRepeating,
    usersRepeatingMoreThanTwo
  };
}
