import {
  startOfDay,
  addDays,
  subDays,
  startOfMonth,
  startOfWeek,
  subWeeks,
  endOfWeek,
  subMonths,
  endOfMonth,
  startOfYear,
  endOfYear,
  subHours
} from 'date-fns';

// const offset = true;

export default (daterange, options = {}) => {
  if (!daterange) return { startDate: '', endDate: '' };
  let startDate = daterange.start ? new Date(daterange.start) : '';
  let endDate = daterange.end ? new Date(daterange.end) : '';

  if (typeof daterange === 'object') {
    startDate = new Date(daterange.start);
    endDate = new Date(daterange.end);
  }

  if (daterange === 'today') {
    startDate = options.adjustTimeZone ? startOfDay(subHours(new Date(), 2)) : startOfDay(new Date());
    endDate = startOfDay(addDays(startDate, 1));
  }

  if (daterange === 'yesterday') {
    startDate = subDays(startOfDay(new Date()), 1);
    endDate = startOfDay(new Date());
  }

  if (daterange === 'thisweek') {
    startDate = startOfWeek(startOfDay(new Date()));
    endDate = startOfDay(addDays(new Date(), 1));
  }

  if (daterange === 'thismonth') {
    startDate = startOfMonth(startOfDay(new Date()));
    endDate = startOfDay(addDays(new Date(), 1));
  }

  if (daterange === 'lastweek') {
    startDate = subWeeks(startOfWeek(startOfDay(new Date())), 1);
    endDate = startOfDay(addDays(endOfWeek(startDate), 1));
  }

  if (daterange === 'lastmonth') {
    startDate = subMonths(startOfMonth(startOfDay(new Date())), 1);
    endDate = startOfDay(addDays(endOfMonth(startDate), 1));
  }

  if (daterange === 'thisyear') {
    startDate = startOfYear(new Date());
    endDate = addDays(endOfYear(startDate), 1);
  }

  return { startDate, endDate };
};
