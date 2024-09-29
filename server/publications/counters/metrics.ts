import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Metrics from '../../../server/collections/metrics';
Meteor.publish('Metrics', function () {
  const query = {
    _id: 'dealMetrics'
  };

  return Metrics.find(query);
});
