import { Meteor } from 'meteor/meteor';
import { Counter } from 'meteor/natestrauser:publish-performant-counts';
import Deals from '../../collections/deals';

Meteor.publish('dealRequests', function () {
  return Counter('dealRequests', Deals.find({ status: 'requested' }));
});
