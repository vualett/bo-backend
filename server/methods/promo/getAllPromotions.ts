import { Meteor } from 'meteor/meteor';
import Promotions from '../../collections/promotions';

export const getAllPromotions = (): Meteor.Promotion[] => {
  return Promotions.find().fetch();
};

Meteor.methods({
  'promotion.getAll': getAllPromotions
});
