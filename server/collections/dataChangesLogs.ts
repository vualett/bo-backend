import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

export const DataChangesLogs = new Mongo.Collection<Meteor.DataChangesLog>('dataChangesLogs');