import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import logger from '../logger/log';
import { fetch } from 'meteor/fetch';
import Deals from '../collections/deals';
import Security from '../utils/security';

import * as Sentry from '@sentry/node';
async function createOverdueCase(cashAdvanceID) {
  check(cashAdvanceID, String);
  Security.checkIfAdmin(this.userId);
  try {
    const cashAdvance = Deals.findOne(
      { _id: cashAdvanceID },
      {
        fields: {
          amount: 1,
          overdueSince: 1,
          userId: 1,
          status: 1,
          'payments.number': 1,
          'payments.status': 1,
          'payments.date': 1,
          'payments.amount': 1,
          'payments.returnCode': 1,
          'payments.declinedAt': 1,
          createdAt: 1,
          approvedAt: 1,
          activateAt: 1
        }
      }
    );

    if (!cashAdvance) return false;

    const customer = Meteor.users.findOne(
      { _id: cashAdvance.userId },
      {
        fields: {
          firstName: 1,
          lastName: 1,
          phone: 1,
          emails: 1
        }
      }
    );

    await Deals.update({ _id: cashAdvanceID }, { $set: { overdueSince: new Date() } });

    return await fetch('http://165.22.188.206:8080/overdue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cashAdvanceId: cashAdvance._id,
        overdueSince: new Date(),
        ...cashAdvance,
        customer
      })
    });
  } catch (error) {
    console.log(error);
    logger.error(`[${this.userId}] ${JSON.stringify(error)}`);
    Sentry.captureException(error);
    if (error.response.statusCode === 409) throw new Meteor.Error(409, 'duplicate case');
    throw error;
  }
}

Meteor.methods({
  createOverdueCase
});
