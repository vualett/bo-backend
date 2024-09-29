import { Mongo } from 'meteor/mongo';

const SupportedBanks = new Mongo.Collection('supportedbanks');

export default SupportedBanks;
