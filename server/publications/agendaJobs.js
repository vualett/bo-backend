import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import Security from '../utils/security';

const AgendaJobs = new Mongo.Collection('agendaJobs');

Meteor.publish({
  agendaJobs() {
    Security.checkRole(this.userId, 'super-admin', ['technical']);
    return AgendaJobs.find({
      $or: [{ failedAt: { $ne: null } }, { type: 'single' }]
    });
  }
});
