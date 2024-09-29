import { Meteor } from 'meteor/meteor';
import * as Sentry from '@sentry/node';
import logger from '../logger/log';
import { sendNotification } from '../notifications/sendNotification';

export const sendCongratulations = async (userId: string): Promise<void> => {
  try {
    await sendNotification({
      targetId: userId,
      title: 'Happy birthday 🥳',
      message: 'From Ualett® we wish you a happy birthday. \nYou are special to us, thank you for your trust!'
    });
  } catch (error) {
    const { message } = error as Meteor.Error;

    logger.error(`notification.sendCongratulations[${userId}]${message}`);
    Sentry.captureException(error, { extra: { userId } });
  }
};
