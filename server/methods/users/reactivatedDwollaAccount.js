import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../utils/security';
import Dwolla from '../../dwolla/dwolla';
import * as Sentry from '@sentry/node';
import logger from '../../logger/log';
export default async function reactivatedDwollaAccount(userId) {
  try {
    check(userId, String);

    const user = Meteor.users.findOne({ _id: userId });

    const { dwollaCustomerURL } = user;
    if (!dwollaCustomerURL) return false;

    const updated = await Dwolla()
      .post(dwollaCustomerURL, { status: 'reactivated' })
      .then((res) => res.headers.get('location'));

    return updated;
  } catch (error) {
    logger.error(`users.reactivatedDwollaAccount[${userId}] ${JSON.stringify(error)}`);
    Sentry.captureException(error);
    return error;
  }
}

export async function deactivateDwollaAccount(userId) {
  try {
    check(userId, String);

    const user = Meteor.users.findOne({ _id: userId });

    const { dwollaCustomerURL } = user;
    if (!dwollaCustomerURL) return false;

    const updated = await Dwolla()
      .post(dwollaCustomerURL, { status: 'deactivate' })
      .then((res) => res.headers.get('location'));

    return updated;
  } catch (error) {
    logger.error(`users.deactivateDwollaAccount[${userId}] ${JSON.stringify(error)}`);
    Sentry.captureException(error);
    return error;
  }
}

Meteor.methods({
  'users.reactivatedDwollaAccount': function reactivatedDwollaAccountMethod(userId) {
    Security.checkRole(this.userId, ['super-admin', 'technical', 'admin', 'manager', 'overdue']);
    return reactivatedDwollaAccount(userId);
  },

  'users.dwolla.reactivate': reactivatedDwollaAccount,
  'users.dwolla.deactivate': function deactivateDwollaAccountMethod(params) {
    Security.checkIfAdmin(this.userId);
    return deactivateDwollaAccount(params);
  }
});
