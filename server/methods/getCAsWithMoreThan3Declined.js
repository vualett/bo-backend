/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Meteor } from 'meteor/meteor';
import Security from '../utils/security';
import Deals from './collections/deals';

Meteor.methods({
  async getCAsWithMoreThan3Declined() {
    this.unblock();
    Security.checkIfAdmin(this.userId);
    const pipeline = [
      { $match: { overdueSince: { $exists: false } } },
      {
        $project: {
          declined_payments: {
            $filter: {
              input: '$payments',
              as: 'item',
              cond: {
                $eq: ['$$item.status', 'declined']
              }
            }
          }
        }
      },
      {
        $project: {
          declined_payments: {
            $cond: {
              if: {
                $isArray: '$declined_payments'
              },
              then: {
                $size: '$declined_payments'
              },
              else: 0
            }
          }
        }
      },
      {
        $match: {
          declined_payments: {
            $gte: 3
          }
        }
      }
    ];
    const result = await Deals.rawCollection().aggregate(pipeline).toArray();

    console.log(`to update: ${result.length}`);

    let updateIncrement = 0;

    for (const cashAdvance of result) {
      const updated = await Deals.rawCollection().update(
        { _id: cashAdvance._id },
        { $set: { overdueSince: new Date() } },
        { multi: true }
      );
      if (updated) updateIncrement += 1;
    }

    console.log(`Updated: ${updateIncrement}`);

    return 'done';
  }
});
