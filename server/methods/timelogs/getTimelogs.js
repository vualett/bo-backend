import Timelogs from '../../collections/timelogs';
import { check } from 'meteor/check';
import logger from '../../logger/log';
import Security from '../../utils/security';
import * as Sentry from '@sentry/node';
import { Meteor } from 'meteor/meteor';
const findTimelogs = async ({ userId, startDate, endDate, type, event, dealId, eventType }) => {
  check(userId, String);

  try {
    const WorkerId = Meteor.userId();

    if (WorkerId) {
      Security.checkRole(WorkerId, ['admin', 'technical', 'validation']);
    } else {
      throw new Meteor.Error('Not Have Role to access');
    }

    const query = { userId };
    if (!isNaN(Date.parse(startDate)) && !isNaN(Date.parse(endDate)))
      query.timestamp = {
        $gte: new Date(startDate),
        $lt: new Date(endDate)
      };
    if (type) query.type = type;
    if (event) query.event = event;
    if (dealId) query.dealId = dealId;
    if (eventType) query.eventType = eventType;
    const result = await Timelogs.find(query).fetch();

    return result;
  } catch (error) {
    Sentry.captureException(error);

    logger.error(`timelogs.get ${error}`);

    throw new Meteor.Error('Internal Server Error', error.name, error.message);
  }
};

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'timelogs.get'
};

Meteor.methods({
  [method.name]: findTimelogs
});
