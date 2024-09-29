import { Mongo } from 'meteor/mongo';

const AccessLogs = new Mongo.Collection('accessLogs');

export default AccessLogs;
