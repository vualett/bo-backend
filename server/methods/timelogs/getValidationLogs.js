import { Meteor } from 'meteor/meteor';
import Timelogs from '../../collections/timelogs';
import { check } from 'meteor/check';
import endOfDay from 'date-fns/endOfDay';
import { asyncForEach } from '../../utils/utils';
import logger from '../../logger/log';
import Security from '../../utils/security';
import * as Sentry from '@sentry/node';
const findValidationTimelogs = async ({ startDate, endDate }) => {
  check(startDate, Date);
  check(endDate, Date);
  Security.checkIfAdmin(this.userId);

  try {
    const logs = await Timelogs.find({
      timestamp: {
        $gt: startDate,
        $lte: endOfDay(endDate)
      },
      event: {
        $in: ['account completed', 'account declined', 'account verified', 'account suspended']
      }
    }).fetch();

    let _logs = [];
    await asyncForEach(logs, async (item) => {
      const user = Meteor.users.findOne({ _id: item.userId });
      const by = item?.metadata?.by ? await Meteor.users.findOne({ _id: item.metadata.by }) : undefined;
      _logs.push({ ...item, user, by });
    });
    return _logs;
  } catch (error) {
    logger.error(`timelogs.getValidationLogs ${error}`);
    Sentry.captureException(error);
    throw new Meteor.Error('Internal Server Error', error.name, error.message);
  }
};

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'timelogs.getValidationLogs'
};

Meteor.methods({
  [method.name]: findValidationTimelogs
});
