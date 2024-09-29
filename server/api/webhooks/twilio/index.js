/* eslint-disable camelcase */
import { Meteor } from 'meteor/meteor';
import express from 'express';
import logTwilioPhoneCall from './logTwilioPhoneCall';
import markPhoneCallInit from './markPhoneCallInit';
import formatNumber from './formatNumber';
import { API } from '../../api';
import logger from '../../../logger/log';

API.post(
  '/webhooks/twilio/voice',
  express.json(),
  Meteor.bindEnvironment(async (req, res) => {
    try {
      const { body } = req;

      const { EventType, TaskChannelUniqueName, TaskAttributes, dateCreated, WorkerName, duration } = body;

      if (TaskChannelUniqueName !== 'voice') {
        res.status(201).send('Not voice');
        return;
      }
      if (!TaskAttributes) {
        res.status(201).send('Attributes missing');
        return;
      }

      const { direction, from, outbound_to } = TaskAttributes;

      const customerNumber = direction === 'outbound' ? outbound_to : from;
      const PHONE_NUMBER = formatNumber(customerNumber);

      if (EventType === 'task.created') {
        await markPhoneCallInit({ PHONE_NUMBER });
      }

      if (EventType === 'task.completed' || EventType === 'task.canceled') {
        // mark the call as ended
        await markPhoneCallInit({ PHONE_NUMBER }, true);

        logTwilioPhoneCall({
          CALL_TYPE: direction,
          PHONE_NUMBER,
          USER_ID: WorkerName,
          START_DATE: new Date(dateCreated),
          DURATION: duration
        });
      }
      res.status(201).send('Received');
    } catch (error) {
      logger.error('webhooks/twilio/voice error:', error);
      res.status(500).send('Something went wrong!');
    }
  })
);
