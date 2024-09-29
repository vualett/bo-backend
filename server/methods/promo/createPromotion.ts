import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Promotions from '../../collections/promotions';

const createPromotion = (promotion: Meteor.Promotion): Meteor.Promotion | never => {
  const { name, description, maxInvitation, limitDateOfDayInvitation, dateStart, dateEnd } = promotion;

  check(name, String);
  check(description, String);
  check(maxInvitation, Number);
  check(limitDateOfDayInvitation, Number);
  check(dateStart, Date);
  check(dateEnd, Date);

  const promotionId = Promotions.insert(promotion);

  const newPromotion = Promotions.findOne({ _id: promotionId });

  if (newPromotion === undefined) {
    throw new Meteor.Error('Promotion not created');
  }

  return newPromotion;
};

Meteor.methods({
  'promotion.create': createPromotion
});
