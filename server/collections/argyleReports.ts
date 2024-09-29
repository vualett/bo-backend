import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

const ArgyleReports = new Mongo.Collection<Meteor.ArgyleReports>('argyleReports');

export default ArgyleReports;
