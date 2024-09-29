import crypto from 'crypto';
import logger from '../logger/log';
import startOfDay from 'date-fns/startOfDay';
import * as _ from 'lodash';
import differenceInYears from 'date-fns/differenceInYears';
import { parseISO } from 'date-fns';
export const getRandomCode = () => `${Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000}`;

export const generateCode = () => {
  const code = Array(...Array(6))
    .map(() => Math.floor(Math.random() * 10))
    .join('');

  return code;
};

export const verifyGatewaySignature = (proposedSignature, webhookSecret, payloadBody) => {
  const hash = crypto.createHmac('sha256', webhookSecret).update(payloadBody).digest('hex');

  return proposedSignature === hash;
};

export const round = (num) => Math.round(num * 100) / 100;

export const arrayExist = (arr) => Array.isArray(arr) && arr.length > 0;

export const groupBy = (xs, key) =>
  xs.reduce((rv, x) => {
    const _rv = rv;
    (_rv[x[key]] = _rv[x[key]] || []).push(x);
    return _rv;
  }, {});

export const arrAvg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

export function containsMultiple(target, pattern) {
  let value = 0;
  pattern.forEach((word) => {
    value += target.includes(word);
  });
  return value === 1;
}

export const flatten = (list) => list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);

export const isMicrosoftEmail = (email) => containsMultiple(email, ['@hotmail.', '@live.', '@outlook.', '@msn.']);

export const arrayToObject = (array, keyField) =>
  array.reduce((obj, item) => {
    obj[item[keyField]] = item;
    return obj;
  }, {});

// Group by time period - By 'day' | 'week' | 'month' | 'year'
// ------------------------------------------------------------
export const groupByTimePeriod = function (array, timestamp, period) {
  const grouped = _.groupBy(array, (occurrence) => startOfDay(occurrence[timestamp]));

  const mapped = Object.keys(grouped).map((key) => ({
    day: new Date(key),
    times: grouped[key]
  }));
  const sorted = mapped.sort((a, b) => new Date(a.day) - new Date(b.day));
  return sorted;
};

export const isJsonString = (str) => {
  try {
    JSON.parse(str);
  } catch (e) {
    logger.error(`isJsonString ${e}`);
    return false;
  }
  return true;
};

export const stringValueToObject = (str) => {
  if (typeof str === 'string') {
    if (str.charAt(0) === '-') {
      return { [str.substring(1)]: -1 };
    } else {
      return { [str]: 1 };
    }
  }
};

export const isUnderaged = (client) => {
  const clientAge = differenceInYears(new Date(), parseISO(client?.identityVerification?.data?.DOB, 'YYYY/MM/DD'));
  if (clientAge < 21) {
    return true;
  } else {
    return false;
  }
};
export const capitalizeFirstLetterOfEachWord = (words) => {
  const separateWord = words.toLowerCase().split(' ');
  for (let i = 0; i < separateWord.length; i++) {
    separateWord[i] = separateWord[i].charAt(0).toUpperCase() + separateWord[i].substring(1);
  }
  return separateWord.join(' ');
};

export const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

export function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}
