import { Mongo } from 'meteor/mongo';

const JobQueue = new Mongo.Collection('jobQueue');

export default JobQueue;
