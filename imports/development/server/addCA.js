import { Meteor } from 'meteor/meteor';
import { sample } from 'lodash';
import Security from '../../../server/utils/security';
import * as Sentry from '@sentry/node';
import logger from '../../../server/logger/log';

function addCA(userID) {
  this.unblock();
  Security.checkIfAdmin(this.userId);
  const user = Meteor.users.findOne({ _id: userID });

  let deal = {
    amount: sample([550, 700, 1000]),
    termsOfPayment: 'weekly',
    numberOfPayments: sample([6, 8, 10]),
    fee: 0.1,
    base64Sign: 'fakeSign'
  };

  if (['none', 'suspended'].includes(user.category.toLowerCase())) {
    deal = {
      amount: 0,
      termsOfPayment: 'weekly',
      numberOfPayments: 0,
      fee: 0.0,
      base64Sign: 'fakeSign'
    };
  }

  try {
    Meteor.call('deals.request', deal, userID);

    return true;
  } catch (e) {
    logger.error(`_dev.users.addCA[${userID}]${e}`);
    Sentry.captureException(e, { extra: userID });
    return false;
  }
}

Meteor.methods({ '_dev.users.addCA': addCA });
