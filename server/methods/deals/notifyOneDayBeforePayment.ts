import { Meteor } from 'meteor/meteor';

import { asyncForEach } from '../../utils/utils';
import addDays from 'date-fns/addDays';
import deals from '../../collections/deals';
import endOfDay from 'date-fns/endOfDay';
import startOfDay from 'date-fns/startOfDay';
import notifyUser from '../../notifications/notifyUser';
import { NotifyChannel } from '../../notifications/notifyChannel';
export async function sendNotifyDayBeforePayment(): Promise<void> {
  const result = await deals
    .rawCollection()
    .aggregate([
      {
        $match: {
          status: 'active'
        }
      },
      {
        $unwind: {
          path: '$payments'
        }
      },
      {
        $match: {
          'payments.status': 'schedule',
          'payments.date': {
            $gte: startOfDay(addDays(new Date(), 1)),
            $lt: endOfDay(addDays(new Date(), 1))
          }
        }
      },
      {
        $project: {
          userId: 1,
          number: '$payments.number'
        }
      }
    ])
    .toArray();

  await asyncForEach(result, async ({ userId, number }: { userId: string; number: number }) => {
    await notifyUser({
      body: `Hey there! Just a quick heads-up that your Payment #${number} is set for tomorrow. Hope you're having a great day!`,
      service: 'Upcoming Payment',
      userId: userId,
      channel: NotifyChannel.PUSH
    });
  });
}

Meteor.methods({
  'deals.sendNotifyDayBeforePayment': sendNotifyDayBeforePayment
});
