import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

export const Backups = new Mongo.Collection<Meteor.Backups>('backups');
