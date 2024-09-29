/* eslint-disable no-unneeded-ternary */
import Timelogs from '../../collections/timelogs';
import { check } from 'meteor/check';
import { capitalizeFirstLetterOfEachWord } from '../../utils/utils';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import { Meteor } from 'meteor/meteor';

export const insertTimelog = async ({ userId, dealId, event, type, eventType, metadata, _by }) => {
  check(userId, String);
  check(event, String);
  check(type, String);
  let responsable2;
  const _pipeline = [
    {
      $match: {
        _id: userId
      }
    },
    {
      $unwind: {
        path: '$assignedAgent'
      }
    },
    {
      $project: {
        _id: 0,
        category: '$assignedAgent.category',
        timestamp: '$assignedAgent.timestamp',
        firstName: '$assignedAgent.agent.firstName',
        lastName: '$assignedAgent.agent.lastName',
        Id: '$assignedAgent.agent.id'
      }
    },
    {
      $match: {
        category: 'validation'
      }
    },
    {
      $limit: 1
    }
  ];

  const responsable = _by ? null : await Meteor.users.rawCollection().aggregate(_pipeline).toArray();
  if (!_by) {
    responsable2 = Meteor.users.findOne({ _id: this.userId || Meteor.userId() });
  }

  const by = _by
    ? _by
    : responsable
    ? responsable[0]?.category === 'validation'
      ? {
          name: capitalizeFirstLetterOfEachWord(`${responsable[0]?.firstName} ${responsable[0]?.lastName}`),
          id: responsable[0]?.Id
        }
      : {
          name: capitalizeFirstLetterOfEachWord(`${responsable2?.firstName} ${responsable2?.lastName}`),
          id: responsable2?._id
        }
    : null;

  if (metadata) {
    const client = Meteor.users.findOne({ _id: userId }, { metrics: 1 });

    metadata.hasCashAdvance = client.metrics?.cashAdvances?.count ? true : false;
  }

  try {
    Timelogs.insert({
      userId,
      dealId,
      event,
      eventType,
      type,
      timestamp: new Date(),
      metadata,
      ...(by ? { by } : {})
    });
  } catch (error) {
    logger.error(`timelogs.insert [${userId}] ${error}`);
    Sentry.captureException(error);
  }
};

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'timelogs.insert'
};

Meteor.methods({
  [method.name]: insertTimelog
});
