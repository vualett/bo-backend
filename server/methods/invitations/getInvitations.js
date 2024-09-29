import { Meteor } from 'meteor/meteor';
import { subDays, subHours } from 'date-fns';
import { check } from 'meteor/check';
import Invitations from '../../collections/invitations';
import logger from '../../logger/log';
import Security from '../../utils/security';
import * as Sentry from '@sentry/node';
const InvitationsCollection = Invitations.rawCollection();

Meteor.methods({
  getInvitations(selected) {
    Security.checkIfAdmin(this.userId);
    try {
      check(selected, String);
      let startDate = subHours(new Date(), 4);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      if (selected === '15days') {
        startDate = subDays(startDate, 15);
      }

      if (selected === '30days') {
        startDate = subDays(startDate, 30);
      }

      if (selected === '90days') {
        startDate = subDays(startDate, 90);
      }

      const pipeline = [
        {
          $match: {
            when: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $lookup: {
            from: Meteor.users._name,
            localField: 'by',
            foreignField: '_id',
            as: 'invitedBy'
          }
        },
        {
          $lookup: {
            from: Meteor.users._name,
            localField: 'userId',
            foreignField: '_id',
            as: 'owner'
          }
        },
        {
          $project: {
            phone: 1,
            used: 1,
            by: 1,
            when: 1,
            userId: 1,
            invitedBy: { $arrayElemAt: ['$invitedBy', 0] },
            owner: { $arrayElemAt: ['$owner', 0] },
            metadata: 1,
            interaction: 1
          }
        },
        {
          $project: {
            phone: 1,
            used: 1,
            by: 1,
            when: 1,
            userId: 1,
            'invitedBy.firstName': 1,
            'invitedBy.lastName': 1,
            'owner.firstName': 1,
            'owner.lastName': 1,
            metadata: 1,
            interaction: 1
          }
        }
      ];

      const results = InvitationsCollection.aggregate(pipeline, {
        allowDiskUse: true
      }).toArray();

      return results;
    } catch (error) {
      Sentry.captureException(error);
      logger.error(`getInvitations ${error}`);
      throw error;
    }
  }
});
