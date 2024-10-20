import { addWeeks, addDays, setHours, startOfDay, setISODay, getISODay, differenceInCalendarDays } from 'date-fns';

// DAY      ISODAY
// monday     1
// tuesday    2
// wednesday  3
// thursday   4
// friday     5
// saturday   6
// sunday     7

export default function getPaymentDay(date, ISODay) {
  let newDate = setHours(startOfDay(date), 12);

  if (ISODay) {
    newDate = setISODay(newDate, ISODay);
    const diff = differenceInCalendarDays(newDate, date);
    if (diff < -1) newDate = addWeeks(newDate, 1);
  } else {
    const ISOIndex = getISODay(date);

    if (ISOIndex === 6) newDate = addDays(newDate, 2);
    if (ISOIndex === 7) newDate = addDays(newDate, 1);
  }

  return addWeeks(newDate, 1);
}
