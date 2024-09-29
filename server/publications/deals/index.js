import { Meteor } from 'meteor/meteor';
import './deals';
import dealsPaginated from './dealsPaginated';
import requestedDeals from './requestedDeals';
import './dealsPayments';

Meteor.publish({ dealsPaginated, requestedDeals });
