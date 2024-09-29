import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import Security from '../utils/security';
import { parsePhoneNumber } from 'libphonenumber-js';
import * as Sentry from '@sentry/node';

const fields = {
  firstName: 1,
  lastName: 1,
  'emails.address': 1,
  'phone.number': 1,
  currentCashAdvance: 1
};

async function queryByEmail(search, state) {
  return Meteor.users
    .rawCollection()
    .find({
      ...(state && { 'address.state': state }),
      emails: {
        $elemMatch: { address: search || '' }
      }
    })
    .limit(20)
    .project(fields)
    .toArray();
}

async function _default(search, state) {
  const nameSplit = search.split(' ');
  const nameParsableFormat = nameSplit.length === 2;
  return Meteor.users
    .rawCollection()
    .aggregate([
      {
        $search: {
          index: 'userSearch',
          compound: {
            should: [
              ...(nameParsableFormat && [
                {
                  autocomplete: {
                    query: nameSplit[0],
                    path: 'firstName',
                    score: {
                      boost: {
                        value: 1.2
                      }
                    }
                  }
                },
                {
                  autocomplete: {
                    query: nameSplit[1],
                    path: 'lastName',
                    score: {
                      boost: {
                        value: 1.2
                      }
                    }
                  }
                }
              ]),
              {
                autocomplete: {
                  query: search,
                  path: 'firstName',
                  fuzzy: {
                    maxEdits: 1
                  }
                }
              },
              {
                autocomplete: {
                  query: search,
                  path: 'lastName',
                  fuzzy: {
                    maxEdits: 1
                  }
                }
              }
            ]
          }
        }
      },
      {
        $match: {
          ...(state && { 'address.state': state }),
          isAdmin: {
            $ne: true
          }
        }
      },
      {
        $project: fields
      },
      {
        $limit: 20
      }
    ])
    .toArray();
}

async function queryByPhoneNumber(search, state) {
  const { number } = parsePhoneNumber(search, 'US');

  const result = Meteor.users.findOne(
    {
      ...(state && { 'address.state': state }),
      $or: [
        { 'phone.number': number || '' },
        {
          'phone.others': {
            $elemMatch: { number: number || '' }
          }
        }
      ]
    },
    { fields }
  );

  return result !== undefined ? [result] : [];
}

async function _search({ search, type, state }) {
  try {

    Security.checkIfAdmin(this.userId);
    check(search, Match.OneOf(String, null, undefined));
    check(type, Match.OneOf('number', 'email', 'name'));
    this.unblock();

    if (search?.length === 0) return;
    if (type === 'number') {
      return queryByPhoneNumber(search, state);
    } else if (type === 'email') {
      return queryByEmail(search, state);
    } else if (type === 'name') {
      return _default(search, state);
    }

  } catch (error) {
    Sentry.captureException(error);
  }
}

Meteor.methods({ searchCustomers: _search });
