import { Meteor } from 'meteor/meteor';
import { Settings } from '../../collections/settings';
import Security from '../../utils/security';

function setDailyGoal(value) {
  Security.checkIfAdmin(this.userId);
  Settings.update({ _id: 'dailyGoal' }, { $set: { value } });
  return true;
}

Meteor.methods({
  'ualett.setDailyGoal': setDailyGoal
});
