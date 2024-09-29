import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';
import { Settings } from '../../collections/settings';
import logger from '../../logger/log';
import { check } from 'meteor/check';
import { Random } from 'meteor/random';
import * as Sentry from '@sentry/node';
Meteor.methods({
  'settings.botReceiversList.get': function getSettingMethod() {
    Security.checkIfAdmin(this.userId);
    return Settings.findOne({ _id: 'botReceiversList' });
  },
  'settings.botReceiversList.update': async function createReportMethod({ action, category, user, chatID, id }) {
    check(action, String);
    check(category, String);
    Security.checkRole(this.userId, ['super-admin', 'technical']);

    try {
      const query = { _id: 'botReceiversList' };
      const currentList = await Settings.findOne(query);

      if (!currentList) {
        // The first action must be an add
        check(user, String);
        check(chatID, String);
        Settings.insert({
          _id: 'botReceiversList',
          [category]: [
            {
              id: Random.id(),
              user,
              chatID
            }
          ]
        });
        return true;
      } else {
        // Switch methods
        const _switch = {
          add: () => {
            check(user, String);
            check(chatID, String);
            Settings.update(query, {
              $set: {
                [category]: [
                  ...currentList[category],
                  {
                    id: Random.id(),
                    user,
                    chatID
                  }
                ]
              }
            });
          },
          remove: () => {
            check(id, String);
            Settings.update(query, {
              $set: {
                [category]: currentList[category].filter((item) => item.id !== id)
              }
            });
          },
          update: () => {
            check(user, String);
            check(chatID, String);
            check(id, String);
            Settings.update(query, {
              $set: {
                [category]: [
                  ...currentList[category].filter((item) => item.id !== id),
                  {
                    id,
                    user,
                    chatID
                  }
                ]
              }
            });
          }
        };

        if (['add', 'remove', 'update'].includes(action)) {
          _switch[action]();
          return true;
        } else {
          throw new Meteor.Error('Internal Server Error', 'Action does not exist');
        }
      }
    } catch (err) {
      logger.error(`settings.botReceiversList.update: ${err}`);
      Sentry.captureException(err);
      throw err;
    }
  }
});
