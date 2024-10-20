import express, { Request, Response, NextFunction } from 'express';
import { API } from '../../api';
import logger from '../../../logger/log';
import { Meteor } from 'meteor/meteor';

interface UpdateRemittanceDayRequest extends Request {
  body: {
    userId: string;
    RemittanceDay: number;
  };
}

const isValidWeekday = (RemittanceDay: number) =>
  Number.isInteger(RemittanceDay) && RemittanceDay >= 1 && RemittanceDay <= 5;

API.post(
  '/user/remittanceDay',
  express.json(),
  async (req: UpdateRemittanceDayRequest, res: Response, next: NextFunction) => {
    try {

      const { userId, RemittanceDay } = req.body;

      if (!RemittanceDay) {
        res.status(400).json({ error: 'Invalid RemittanceDay' });
        return;
      }

      if (!userId) {
        res.status(400).json({ error: 'Invalid userId' });
        return;
      }

     const user = Meteor.users.findOne({_id: userId})

      if (!user ) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      if (!isValidWeekday(RemittanceDay)) {
        res.status(400).json({ error: 'Invalid RemittanceDay. Must be an integer between 1 and 5.' });
        return;
      }

      const updateResult = Meteor.users.update(
        { _id: userId },
        { $set: { paymentISODay: RemittanceDay } }
      );

      if (!updateResult) {
        res.status(500).json({ error: 'Failed to update user.' });
        return;
      }

      res.status(200).json(updateResult);
    } catch (error) {
      logger.error('API::/user/remittanceDay', error);
      res.status(500).json({ error: 'Something went wrong' });
      next(error); 
    }
  }
);
