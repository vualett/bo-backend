import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import insertLog from '../logs/insertGenericLog';
import * as Sentry from '@sentry/node';
import logger from '../../logger/log';
import notifyUser from '../../notifications/notifyUser';
import { NotifyChannel } from '../../notifications/notifyChannel';
import { isUserApplicableToPromotion } from '../promo/isUserApplicableToPromotion';
import { isDealInOverdue } from '../deals/requestDeal/utils';

interface IArguments {
  paymentNumber: number;
  invitedUser: string;
  deal: Meteor.Deal;
}

const checkInvitationAndApplyBonus = async ({ paymentNumber, invitedUser, deal }: IArguments): Promise<void> => {
  try {
    if (paymentNumber !== 1) return;

    if (!(deal?.firstDeal && !deal.referralBonusApplied)) return;

    const user = Meteor.users.findOne({ _id: invitedUser, invitedBy: { $exists: true } });

    if (!(user !== undefined && user.invitedBy.length > 1)) return;

    const dealInviter = Deals.findOne({ userId: user.invitedBy }, { sort: { completeAt: -1 } });

    if (dealInviter && isDealInOverdue(dealInviter.payments)) return;

    const inviter = Meteor.users.findOne({ _id: user.invitedBy });

    if (await isUserApplicableToPromotion({ inviter, dateInvitation: user.invited })) return;

    const updated = Meteor.users.update(
      { _id: user.invitedBy, isPromoter: { $in: [null, false] } },
      { $inc: { bonusAvailable: 10 } }
    );

    if (updated === 0) return;

    insertLog(user.invitedBy, `$${10} bonus added, for referral of ${invitedUser}`);

    Deals.update(
      {
        _id: deal._id
      },
      {
        $set: {
          referralBonusApplied: true
        }
      }
    );

    await notifyUser({
      body: '$10 bonus received for you referral, keep going!',
      service: 'accNotification',
      userId: user.invitedBy,
      channel: NotifyChannel.PUSH
    });
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`deal ${deal._id}, ${JSON.stringify(error)}`);
  }
};

export default checkInvitationAndApplyBonus;
