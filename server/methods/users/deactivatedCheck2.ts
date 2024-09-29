import { Meteor } from 'meteor/meteor';
import { differenceInCalendarDays } from 'date-fns';
import sendCheckWarningAndEnqueue from '../../methods/users/verify/sendCheckWarningAndEnqueue';
import { asyncForEach } from '../../utils/utils';

export async function deactivatedCheck2(): Promise<void> {
  // these are verified users with no cash advances
  const result = await Meteor.users
    .rawCollection()
    .aggregate([
      {
        $match: {
          $and: [
            {
              'status.verified': true
            },
            {
              'status.qualify': true
            },
            {
              category: { $nin: ['none', 'suspended'] }
            },
            {
              isPromoter: {
                $ne: true
              }
            },
            {
              currentCashAdvance: false
            },
            {
              'metrics.cashAdvances.count': {
                $in: [0, null]
              }
            }
          ]
        }
      }
    ])
    .toArray();

  await asyncForEach(result, async (item: Meteor.User) => {
    const daysOfDifference = differenceInCalendarDays(new Date(), item?.verifiedDate);

    if (daysOfDifference >= 3) {
      const Parameters = { userId: item._id, type: 'system' };
      await sendCheckWarningAndEnqueue(Parameters);
    }
  });
}

Meteor.methods({
  'users.deactivatedCheck2': deactivatedCheck2
});
