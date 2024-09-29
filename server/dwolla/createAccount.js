import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Dwolla from './dwolla';
import logger from '../logger/log';
import * as Sentry from '@sentry/node';
import insertLog from '../../server/methods/logs/insertGenericLog';
import customerStatus from '../../server/methods/users/dwolla/checkUserStatus';
export default async function createAccount(UserId, obj) {
  check(obj, {
    firstName: String,
    lastName: String,
    email: String,
    ipAddress: String
  });

  check(UserId, String);

  try {
    const CustomerURL = await Dwolla()
      .post('customers', obj)
      .then((res) => res.headers.get('location'));

    if (!CustomerURL) throw new Meteor.Error('try again later');

    Meteor.users.update({ _id: UserId }, { $set: { dwollaCustomerURL: CustomerURL } });

    return CustomerURL;
  } catch (error) {
    if (error?.body?._embedded?.errors[0]?.code === 'Duplicate') {
      insertLog(UserId, 'CUSTOMER WITH THIS EMAIL ALREADY EXISTS IN DWOLLA');
      if (error?.body?._embedded?.errors[0]?._links?.about?.href) {
        const oldLink = error?.body?._embedded?.errors[0]?._links?.about?.href;

        if ((await customerStatus(oldLink, UserId)) !== 'suspended') {
          Meteor.users.update({ _id: UserId }, { $set: { dwollaCustomerURL: oldLink } });
          return oldLink;
        } else {
          Sentry.captureException(error);
          logger.error(`[${UserId}] ${JSON.stringify(error)}`);
          throw new Meteor.Error('try again later');
        }
      }
    }

    Sentry.captureException(error);
    logger.error(`[${UserId}] ${JSON.stringify(error)}`);
    throw new Meteor.Error('try again later');
  }
}
