import { Client } from 'dwolla-v2';
import { DWOLLA_ENVIRONMENT, DWOLLA_KEY, DWOLLA_SECRET } from '../keys';

const dwolla = new Client({
  key: DWOLLA_KEY,
  secret: DWOLLA_SECRET,
  environment: DWOLLA_ENVIRONMENT
});

export default function _Dwolla() {
  return dwolla;
}
