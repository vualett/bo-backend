import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

export default new Mongo.Collection<Meteor.Promotion>('promotions');
