import { Meteor } from 'meteor/meteor';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import express from 'express';
import { API } from '../api';
import { Settings } from '../../collections/settings';
import logger from '../../logger/log';
import tokenCheck from '../middlewares/tokenCheck';
import * as Sentry from '@sentry/node';
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 10 // start blocking after 2 requests
});

API.get('/dailygoal', tokenCheck, limiter, express.json(), (req, res) => {
  try {
    const dailyGoal = Settings.findOne({ _id: 'dailyGoal' }).value;
    res.status(200).send(
      JSON.stringify({
        status: 'success',
        dailyGoal
      })
    );
  } catch (error) {
    Sentry.captureException(error);
    logger.error('API::dailygoal', error);
    res.status(400).send({ status: 'fail', message: error });
  }
});

API.post('/dailygoal', express.json(), [body('value').exists()], tokenCheck, limiter, (req, res) => {
  try {
    validationResult(req).throw();

    const { value } = req.body;

    const newValue = parseInt(value, 10);
    if (newValue < 0) throw new Meteor.Error('INVALID_VALUE');

    Settings.update({ _id: 'dailyGoal' }, { $set: { value } });

    res.status(200).send(
      JSON.stringify({
        status: 'success',
        message: `Daily goal set to ${value}`
      })
    );
  } catch (error) {
    logger.error('API::dailygoal', error);
    res.status(400).send({ status: 'fail', message: error });
  }
});
