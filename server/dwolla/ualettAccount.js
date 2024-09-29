import { Meteor } from 'meteor/meteor';
import Dwolla from './dwolla';
import Security from '../utils/security';

const account = Meteor.isDevelopment ? '113cad96-7bb1-4bd5-952e-1f1182e228fc' : '1773af76-90df-4b72-9354-5da633891f41';

function cleanArray(actual) {
  const newArray = [];
  for (let i = 0; i < actual.length; i += 1) {
    if (actual[i]) {
      newArray.push(actual[i]);
    }
  }
  return newArray;
}

export default async function get() {
  Security.checkRole(this.userId, 'super-admin');

  const result = await Dwolla()
    .get('/')
    .then((res) => res.body);

  return result;
}

Meteor.methods({ 'dwolla.get': get });

async function getPaymnets() {
  Security.checkIfAdmin(this.userId);
  const limit = 200;

  const interactor = [];

  for (let i = 0; i < 49; i += 1) {
    interactor.push(limit * i);
  }

  const results = interactor.map(async (i) => {
    const URL = `https://api.dwolla.com/accounts/${account}/transfers?&limit=200&offset=${i}`;
    return Dwolla().get(URL);
  });

  const filtered = cleanArray(results);

  const results2 = await Promise.all(filtered);
  return results2.map((res) => res.body._embedded.transfers).reduce((acc, val) => [...acc, ...val]);
}
Meteor.methods({ 'dwolla.getAllTransfers': getPaymnets });
