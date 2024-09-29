import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

export default new Mongo.Collection<Meteor.Metrics>('metrics');
