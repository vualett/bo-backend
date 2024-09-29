import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
const Invitations = new Mongo.Collection<Meteor.Invitations>('invitations');

export default Invitations;
