import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Dwolla from './dwolla';
import logger from '../logger/log';
import * as Sentry from '@sentry/node';
export default async function updateAccount(dwollaCustomerURL: String, obj: Object) {
  //note crear un metodo general por el cual , todos los que tengan emailverify y link de dwolla se le actualize el correo

  check(obj, {
    firstName: String,
    lastName: String,
    email: String,
    ipAddress: String
  });
  check(dwollaCustomerURL, String);

  try {
    const CustomerURL = await Dwolla()
      .post(`customers/${dwollaCustomerURL}`, obj)
      .then((res) => res.body.id);

    if (!CustomerURL) throw new Meteor.Error('try again later');

    // Meteor.users.update({ _id: UserId }, { $set: { dwollaCustomerURL: CustomerURL } });

    return CustomerURL;
  } catch (error: unknown) {
    const { message } = error as Error;
    Sentry.captureException(error);
    logger.error(`[${dwollaCustomerURL}] ${JSON.stringify(message)}`);
    throw new Meteor.Error('try again later');
  }
}
