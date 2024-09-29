import { Meteor } from 'meteor/meteor';
import { API } from '../api';
import * as Sentry from '@sentry/node';
import logger from '../../../server/logger/log';
const pipeline = [
  {
    $match: {
      type: 'user',
      'status.qualify': { $eq: true },
      'status.verified': { $eq: false }
    }
  },
  {
    $project: {
      hasFunding: 1,
      hasDriverLicense: 1,
      has1099Form: 1,
      lastEmail: { $slice: ['$emails', -1] },
      firstName: 1,
      lastName: 1,
      lastCall: 1
    }
  },
  {
    $match: {
      $or: [
        { hasFunding: { $eq: false } },
        { hasDriverLicense: { $eq: false } },
        { 'lastEmail.verified': { $eq: false } }
      ]
    }
  },
  {
    $project: {
      firstName: 1,
      lastName: 1,
      lastCall: 1
    }
  }
];
API.get('/external/users/incomplete', async (req, res) => {
  try {
    const users = await Meteor.users.rawCollection().aggregate(pipeline).toArray();

    res.status(200).send({ users });
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`Error in /external/users/incomplete: ${error}`);
    return res.status(500).send('FAIL');
  }
});
