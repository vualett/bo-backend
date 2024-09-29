import { Meteor } from 'meteor/meteor';

import Security from '../../../utils/security';
import { Settings } from '../../../collections/settings';
import logger from '../../../logger/log';

import { check } from 'meteor/check';

import startOfDay from 'date-fns/startOfDay';
import endOfDay from 'date-fns/endOfDay';
import * as Sentry from '@sentry/node';
export async function createDiscount(value, startDate, endDate) {
  Security.checkIfAdmin(Meteor.userId());
  check(value > 1);
  try {
    Settings.update(
      {
        _id: 'feeDiscount'
      },
      {
        $set: {
          value: value,
          startDate: startOfDay(startDate),
          endDate: endOfDay(endDate)
        }
      }
    );
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`deals.createDiscount ${error}`);
  }
}

export async function applyDiscount() {
  return { isTrue: false, value: 0 };
  // try {
  //   const feeDiscount = await Settings.findOne({ _id: 'feeDiscount' });

  //   if (
  //     isWithinInterval(new Date(), {
  //       start: feeDiscount.startDate,
  //       end: feeDiscount.endDate
  //     })
  //   ) {
  //     const addFeeDiscount =
  //       !!feeDiscount?.value &&
  //       $(1).minus(feeDiscount.value).valueOf() &&
  //       gt($($(1).minus(feeDiscount.value).valueOf()), $(0)) &&
  //       lt($($(1).minus(feeDiscount.value).valueOf()), $(1));

  //     return await { isTrue: addFeeDiscount, value: feeDiscount.value };
  //   } else {
  //     return { isTrue: false, value: 0 };
  //   }
  // } catch (error) {
  //   logger.error(`deals.applyDiscount ${error}`);
  // }
}

Meteor.methods({
  'deals.createDiscount': createDiscount,
  'deals.applyDiscount': applyDiscount
});
