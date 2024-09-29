import { Mongo } from 'meteor/mongo';

const s3Documents = new Mongo.Collection('s3documents');

export default s3Documents;
