import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';
import logger from '../../logger/log';
import Timelogs from '../../collections/timelogs';
import differenceInMonths from 'date-fns/differenceInMonths';
import { log } from '../../logger/index';
import * as Sentry from '@sentry/node';
export async function exportData(startDate: Date, endDate: Date, userId: string) {
  Security.checkIfAdmin(userId);
  check(startDate, Date);
  check(endDate, Date);
  if (differenceInMonths(endDate, startDate) > 2) throw new Meteor.Error('RANGE TOO HIGH');
  try {
    let data = await Timelogs.rawCollection()
      .aggregate([
        {
          $match: {
            timestamp: {
              $gte: startDate,
              $lt: endDate
            },
            event: {
              $in: [
                'account verified',
                'account declined',
                'reactivation approved',
                'reactivation declined',
                'upgrade approved',
                'upgrade declined'
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              name: '$by.name',
              event: '$event'
            },
            event: {
              $push: {
                link: {
                  $concat: ['https://backoffice.ualett.com/user/', '$userId']
                }
              }
            }
          }
        },
        {
          $project: {
            by: '$_id.name',
            event: '$_id.event',
            Links: '$event'
          }
        },
        {
          $unwind: {
            path: '$Links'
          }
        }
      ])
      .toArray();

    return data;
  } catch (error) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`users.exportValidationData ${message}`);
  }
}

Meteor.methods({
  'users.exportValidationData': exportData
});
