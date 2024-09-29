import { check } from 'meteor/check';
import logger from '../logger/log';
import Security from '../utils/security';
import Dwolla from './dwolla';

export default async function updateCustomerRecord(customerURL, obj) {
  Security.checkRole(this.userId, 'super-admin');
  check(customerURL, String);
  check(obj, Object);

  const URL = customerURL;

  const updated = await Dwolla()
    .post(URL, obj)
    .then((res) => res.headers.get('location'))
    .catch((error) => {
      logger.error(`[updateCustomerRecord][${URL}] ${JSON.stringify(error)}`);
      throw error;
    });

  return updated;
}
