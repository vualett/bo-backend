import cron from 'node-cron';
import { Meteor } from 'meteor/meteor';
import { startOfDay } from 'date-fns';
import Deals from '../collections/deals';
import { Settings } from '../collections/settings';

const minGoal = 30;

const setDailyGoal = Meteor.bindEnvironment(() => {
  const completed = Deals.find({
    status: 'completed',
    completeAt: {
      $gte: startOfDay(new Date())
    }
  }).count();

  let goal = 80;
  if (completed >= 40) goal = 90;
  if (completed >= 50) goal = 100;
  if (completed >= 61) goal = 105;
  if (completed >= 71) goal = 110;
  if (completed >= 91) goal = 120;
  if (completed >= 101) goal = 130;
  if (completed >= 120) goal = 150;
  if (completed >= 149) goal = 175;
  if (completed >= 150) goal = 200;
  if (completed >= 200) goal = 225;

  Settings.update({ _id: 'dailyGoal' }, { $set: { value: goal } });
});

cron.schedule('00 16 * * *', setDailyGoal);

// resetting daily goal

const resetDailyGoal = Meteor.bindEnvironment(() => {
  Settings.update({ _id: 'dailyGoal' }, { $set: { value: minGoal } });
});

cron.schedule('0 4 * * *', resetDailyGoal);
