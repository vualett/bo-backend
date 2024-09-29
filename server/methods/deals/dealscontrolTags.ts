import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '/server/utils/security';
import Deals from '../../collections/deals';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
export default async function dealAddtag(id: string, tag: string) {
  const Deal = Deals.findOne({ _id: id });
  const { status } = Deal;
  if (status === 'active') throw new Meteor.Error('');
  try {
    await Deals.update(
      { _id: id },
      {
        $set: {
          ControlTag: tag
        }
      }
    );
  } catch (exception) {
    Sentry.captureException(JSON.stringify(exception));
    logger.error(`deals.controlTags[${id}] ${JSON.stringify(exception)}`);
    throw new Meteor.Error(JSON.stringify(exception));
  }
}
//DEFINING METHOD

const method = {
  type: 'method',
  name: 'deals.controlTags'
};

DDPRateLimiter.addRule(method, 1, 1000);
Meteor.methods({
  [method.name]: function controlTags(id, tag) {
    check(id, String);
    check(tag, String);
    Security.checkRole(Meteor.userId(), ['super-admin', 'admin', 'technical', 'validation']);
    return dealAddtag(id, tag);
  }
});
