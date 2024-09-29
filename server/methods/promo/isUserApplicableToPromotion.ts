import { Meteor } from 'meteor/meteor';
import { isAfter, isBefore, subDays } from 'date-fns';
import Promotions from '../../collections/promotions';
import createIssue from '../../utils/jira/createIssue';

interface Parameters {
  inviter: Meteor.User | undefined;
  dateInvitation: Date;
}

export const isUserApplicableToPromotion = async ({ inviter, dateInvitation }: Parameters): Promise<boolean> => {
  if (inviter === undefined || inviter.promotionDetail === undefined) return false;

  const {
    _id: userId,
    promotionDetail: { _id: promotionId, count: invitationCount }
  } = inviter;

  const promotion = Promotions.findOne({ _id: promotionId });

  if (promotion === undefined) {
    clearPromoUser(userId);
    return false;
  }

  const { maxInvitation, limitDateOfDayInvitation, dateStart, dateEnd, description } = promotion;

  if (isBefore(dateInvitation, dateStart) || isAfter(dateInvitation, dateEnd)) return false;

  if (invitationCount + 1 >= maxInvitation) {
    await createIssue({
      userId,
      title: description,
      description: `User https://backoffice.ualett.com/user/${userId} has reached the maximum number of invitations. Please pay him $${maxInvitation} to his account.`
    });

    incrementValidInvitationCount(promotionId);
    clearPromoUser(userId);
    return true;
  }

  const currentDate = new Date();

  const cutoffDate = subDays(currentDate, limitDateOfDayInvitation);

  if (isAfter(cutoffDate, dateInvitation)) return false;

  Meteor.users.update({ _id: userId }, { $inc: { 'promotionDetail.count': 1 } });

  incrementValidInvitationCount(promotionId);

  return true;
};

const clearPromoUser = (_id: string): void => {
  Meteor.users.update({ _id }, { $unset: { promotionDetail: '' } });
};

const incrementValidInvitationCount = (promotionId: string): void => {
  Promotions.update({ _id: promotionId }, { $inc: { validInvitationCount: 1 } });
};
