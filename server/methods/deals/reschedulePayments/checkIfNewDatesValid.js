import { endOfDay, differenceInCalendarDays, max } from 'date-fns';
import { Meteor } from 'meteor/meteor';

export default function checkIfNewDatesValid(dates, newDate) {
  const dateToCheck = Array.isArray(dates) ? max.apply(this, dates) : dates;

  const diffFromToday = differenceInCalendarDays(dateToCheck, new Date());

  if (diffFromToday > 150) throw new Meteor.Error('TOO_FAR_AWAY');

  if (!Array.isArray(dates)) {
    const controlDate = endOfDay(new Date());
    if (newDate <= controlDate) throw new Meteor.Error('NEW_DATE_IS_BEFORE_TODAY');
  }
}
