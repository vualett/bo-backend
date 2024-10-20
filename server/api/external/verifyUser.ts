import express, { Request, Response, NextFunction } from 'express';
import { API } from '../api';
import logger from '../../logger/log';
import verifiedUser from '/server/methods/users/verify/verify';
import tokenCheck from '/server/api/middlewares/tokenCheck';
import IPWhiteListCheck from '/server/api/middlewares/IPWhiteListCheck';
import { Meteor } from 'meteor/meteor';

interface VerifyRequest extends Request {
  params: {
    userId: string;
  };
  body: {
    category: string;
    weekday: number;
  };
}

const isValidWeekday = (weekday: number): boolean =>
  Number.isInteger(weekday) && weekday >= 1 && weekday <= 5;

API.post(
  '/verify/:userId',
  express.json(),
  IPWhiteListCheck,
  tokenCheck,
  async (req: VerifyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { category, weekday } = req.body;

      if (!userId || typeof userId !== 'string') {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      if (!category || typeof category !== 'string') {
        res.status(400).json({ error: 'Invalid category' });
        return;
      }

      if (!isValidWeekday(weekday)) {
        res.status(400).json({ error: 'Invalid weekday. Must be an integer between 1 and 5.' });
        return;
      }

      const updateResult = await Meteor.users.update(
        { _id: userId },
        { $set: { paymentISODay: weekday } }
      );

      if (!updateResult) {
        res.status(500).json({ error: 'Failed to update user.' });
        return;
      }

      const result = await verifiedUser(userId, category, true, true);
      res.status(200).json(result);
    } catch (error) {
      logger.error('API::/verify/:userId', error);
      res.status(500).json({ error: 'Something went wrong' });
      next(error); 
    }
  }
);
