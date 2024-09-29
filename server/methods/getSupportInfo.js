import { Meteor } from 'meteor/meteor';
import { SUPPORT_NUMBER } from '../keys';

function getSupportInfo() {
  return { supportPhoneNumber: SUPPORT_NUMBER };
}

Meteor.methods({
  getSupportInfo
});
