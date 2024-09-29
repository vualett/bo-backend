import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '/server/utils/security';
export default function changeCategoryType(userId: String, category: String) {
  check(userId, String);
  check(category, String);
  Security.checkRole(Meteor.userId(), ['superAdmin', 'technical']);
  Meteor.users.update(
    { _id: userId },
    {
      $set: {
        categorySince: new Date(),
        categoryType: category
      }
    }
  );
  Meteor.call('timelogs.insert', {
    userId: userId,
    event: `the categoryType ${category}  was change manually`,
    type: 'account',
    eventType: 'category'
  });
}

Meteor.methods({ 'users.changeCategoryType': changeCategoryType });
