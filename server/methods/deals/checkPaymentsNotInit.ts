import { Meteor } from 'meteor/meteor';
import deals from '../../collections/deals';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import { sendNotification } from '../../bot/sendNotification';
import { startOfDay, addDays } from 'date-fns';
import { asyncForEach } from '../../utils/utils';
interface UserInfo {
  link: string;
  status: string;
  date: Date;
}
export async function checkPaymentsNotInit(): Promise<{ result: number; infoUsers: UserInfo[] } | undefined> {
  try {
    const result = (await deals
      .rawCollection()
      .aggregate([
        {
          $match: {
            status: 'active',
            'payments.date': {
              $gte: startOfDay(new Date()),
              $lt: addDays(startOfDay(new Date()), 1)
            }
          }
        },
        {
          $unwind: {
            path: '$payments'
          }
        },
        {
          $project: {
            status: '$payments.status',
            date: '$payments.date',
            link: {
              $concat: ['https://backoffice.ualett.com/user/', '$userId']
            }
          }
        },
        {
          $match: {
            status: 'schedule',
            date: {
              $gte: startOfDay(new Date()),
              $lt: addDays(startOfDay(new Date()), 1)
            }
          }
        }
      ])
      .toArray()) as unknown as Array<{ status: string; date: Date; link: string }>;
    await sendNotification(`${result.length} payment not iniciated Today`);
    const infoUsers: UserInfo[] = [];

    await asyncForEach(result, ({ link, status, date }: { status: string; date: Date; link: string }) => {
      infoUsers.push({ link: link, status: status, date: date });
    });

    return { result: result.length, infoUsers: infoUsers };
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`deals.checkPaymentsNotInit:${error as string}`);
  }
}
Meteor.methods({ 'deals.checkPaymentsNotInit': checkPaymentsNotInit });
