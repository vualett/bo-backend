/* eslint-disable dot-notation */
// import { Meteor } from "meteor/meteor";
import XLSX from 'xlsx';
import { format, endOfDay } from 'date-fns';
import rateLimit from 'express-rate-limit';
import { API } from '../../api';
import { getAgingDBData, process } from './agingPayments2';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';
const limiter = rateLimit({
  windowMs: 1000 * 60, // 1 min
  max: 5 // limit each IP to 1 requests per windowMs
});

const fileName = 'aging';

export default async function getData(date) {
  if (!date) return false;

  const data = await getAgingDBData(date);

  return process(data, date);
}

API.get('/get/agingdataTape', limiter, async (req, res) => {
  // const { secret, enddate } = req.headers;
  const enddate = '2020-12-31';

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${fileName} as of ${format(new Date(enddate), 'MMM dd, yyyy')}.csv"`
  );
  try {
    const _endDate = endOfDay(new Date(enddate));

    const data = await getData(_endDate);

    const dataFormated = data.deals.map((d) => ({
      'DEAL DATE': format(d.activateAt, 'MMM_dd_yyyy'),
      'DEAL PRINCIPAL': d.amount,
      'DEAL FEE': d.feeAmount,
      CUSTOMER: `${d.customer.firstName} ${d.customer.lastName}  | https://backoffice.ualett.com/user/${d.customer._id}`,
      'CURRENT FEE': d.currentAmount,
      'CURRENT PRINCIPAL': d.currentPrincipalAmount,
      '1 IN ARREARS (Principal)': d.oneWeekPrincipalAmount,
      '1 IN ARREARS (Fee)': d.oneWeekFeeAmount,
      '2 IN ARREARS (Principal)': d.twoWeeksPrincipalAmount,
      '2 IN ARREARS (Fee)': d.twoWeeksFeeAmount,
      '3 IN ARREARS (Principal)': d.threeWeeksPrincipalAmount,
      '3 IN ARREARS (Fee)': d.threeWeeksFeeAmount,
      '4 IN ARREARS (Principal)': d.fourWeeksPrincipalAmount,
      '4 IN ARREARS (Fee)': d.fourWeeksFeeAmount,
      '5 OR MORE IN ARREARS (Principal)': d.fiveOrMoreWeeksPrincipalAmount,
      '5 OR MORE IN ARREARS (Fee)': d.fiveOrMoreWeeksFeeAmount,
      'TOTAL IN ARREARS (Principal)': d.totalPrincipalInArrears,
      'TOTAL IN ARREARS (Fee)': d.totalFeeInArrears,
      'OUTSTANDING PRINCIPAL': d.currentPrincipalAmount + d.totalPrincipalInArrears,
      'OUTSTANDING FEE': d.currentFeeAmount + d.totalFeeInArrears,
      'CURRENT SITUATION': d.currentSituation
    }));

    const workbook = XLSX.utils.book_new();

    const myHeader = [
      'DEAL DATE',
      'DEAL PRINCIPAL',
      'DEAL FEE',
      'CUSTOMER',
      'CURRENT FEE',
      'CURRENT PRINCIPAL',
      '1 IN ARREARS (Principal)',
      '1 IN ARREARS (Fee)',
      '2 IN ARREARS (Principal)',
      '2 IN ARREARS (Fee)',
      '3 IN ARREARS (Principal)',
      '3 IN ARREARS (Fee)',
      '4 IN ARREARS (Principal)',
      '4 IN ARREARS (Fee)',
      '5 OR MORE IN ARREARS (Principal)',
      '5 OR MORE IN ARREARS (Fee)',
      'TOTAL IN ARREARS (Principal)',
      'TOTAL IN ARREARS (Fee)',
      'OUTSTANDING PRINCIPAL',
      'OUTSTANDING FEE',
      'CURRENT SITUATION'
    ];

    const worksheet = XLSX.utils.json_to_sheet(dataFormated, {
      header: myHeader
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, `aging as of ${format(new Date(enddate), 'MMM dd, yyyy')}`);

    const file = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'csv'
    });

    return res.status(200).send(file);
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`[API:/get/agingdataTape]${error}`);
    return res.status(500).send('FAIL');
  }
});
