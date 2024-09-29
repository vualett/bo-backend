import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../../utils/security';
import getFundingSource from '../../../dwolla/getFundingSource';
import { asyncForEach } from '../../../utils/utils';
import logger from '../../../../server/logger/log';
import * as Sentry from '@sentry/node';
export default async function updateBankChannels({ userID }) {
  check(userID, String);

  const user = Meteor.users.findOne({ _id: userID });

  if (!user?.dwollaFundingURL) throw new Meteor.Error('No funding URL for this user');

  const fundingSource = await getFundingSource(user.dwollaFundingURL);

  if (!fundingSource?.channels) throw new Meteor.Error('No funding channels returned');

  const set = {
    'bankAccount.channels': fundingSource.channels
  };

  return Meteor.users.update({ _id: userID }, { $set: set });
}

async function updateBankChannelsBatch() {
  Security.checkRole(Meteor.userId(), ['super-admin']);
  // Get all users meeting the requirements
  const users = await Meteor.users
    .find({
      hasFunding: true,
      dwollaFundingURL: { $exists: true },
      'bankAccount.channels': { $exists: false }
    })
    .fetch();

  // Instantiate errors array
  const errors = [];

  // Process every user asyncronously waiting 0.4 sec after each
  await asyncForEach(users, async (user) => {
    try {
      const fundingSource = await getFundingSource(user.dwollaFundingURL);
      if (!fundingSource?.channels) {
        errors.push({
          userId: user._id,
          error: 'No funding channels returned'
        });
        return false;
      }

      const set = {
        'bankAccount.channels': fundingSource.channels
      };
      await Meteor.users.update({ _id: user._id }, { $set: set });

      await new Promise((resolve) => setTimeout(resolve, 400));
    } catch (err) {
      Sentry.captureException(err);
      logger.error(`users.updateBankChannels [${user._id}] ${err}`);
      errors.push({
        userId: user._id,
        error: 'Internal Server Error',
        errorObj: {
          name: err.name,
          message: err.message
        }
      });
    }
  });

  // return error once ready
  return { done: true, errors };
}

Meteor.methods({
  'users.updateBankChannels': (userID) => {
    Security.checkRole(Meteor.userId(), ['technical', 'admin', 'riskProfile']);
    return updateBankChannels(userID);
  },
  'batch.updateBankChannels': updateBankChannelsBatch
});
