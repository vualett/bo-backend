import { Meteor } from 'meteor/meteor';
import notifyUser from '../../notifications/notifyUser';
import { NotifyChannel } from '../../notifications/notifyChannel';
import logger from '../../logger/log';

interface Paramaters {
  userId: string;
}

export async function sendReminderToTakeCashAdvance(props: Paramaters): Promise<void> {
  const { userId } = props;

  try {
    const user = await Meteor.users.findOneAsync({ _id: userId });

    if (!user) {
      throw new Meteor.Error('USER_NOT_FOUND');
    }

    if (user.currentCashAdvance) {
      throw new Meteor.Error('CASH_ADVANCE_ALREADY_REQUESTED');
    }

    await notifyUser({
      body: "Don't miss out on your cash advance! Sign in to your Ualett® APP and make your request. Secure your funds today and stay ahead!",
      service: 'accNotification',
      userId: user._id,
      channel: NotifyChannel.PUSH
    });
  } catch (error) {
    const { message } = error as Meteor.Error;
    logger.error(`[sendReminderToTakeCashAdvance] {${userId}} ${message}`);
  }
}
