/* eslint-disable dot-notation */
import XLSX from 'xlsx';
import { format, endOfDay } from 'date-fns';
import rateLimit from 'express-rate-limit';
import { API } from '../api';
import { getAgingDBData, process } from '../../methods/reports/agingPayments2';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
import { API_SECRETS_BO_CLIENT_GET_FILE } from '../../keys';
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

API.get('/get/aging2file', limiter, async (req, res) => {
  try {
    const { secret, enddate } = req.headers;

    if (secret !== API_SECRETS_BO_CLIENT_GET_FILE) {
      return res.status(401).send('NOT-AUTHORIZED');
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName} as of ${format(new Date(enddate), 'MMM dd, yyyy')}.csv"`
    );

    const _endDate = endOfDay(new Date(enddate));

    const data = await getData(_endDate);

    const dataFormatted = data.deals.map((d) => {
      const totalPrincipalInArrears =
        d.oneWeekPrincipalAmount +
        d.twoWeeksPrincipalAmount +
        d.threeWeeksPrincipalAmount +
        d.fourWeeksPrincipalAmount +
        d.fiveOrMoreWeeksPrincipalAmount;

      const totalFeeInArrears =
        d.oneWeekFeeAmount +
        d.twoWeeksFeeAmount +
        d.threeWeeksFeeAmount +
        d.fourWeeksFeeAmount +
        d.fiveOrMoreWeeksFeeAmount;

      return {
        'DEAL DATE': format(d.activateAt, 'MM/dd/yyyy'),
        'DEAL ID': d._id,
        'DEAL PRINCIPAL': d.amount,
        'DEAL FEE': d.feeAmount,
        'CUSTOMER ID': d.userId,
        'CURRENT FEE': d.currentFeeAmount,
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
        'TOTAL IN ARREARS (Principal)': totalPrincipalInArrears,
        'TOTAL IN ARREARS (Fee)': totalFeeInArrears,
        'TOTAL PRINCIPAL': d.currentPrincipalAmount + d.totalPrincipalInArrears,
        'TOTAL FEE': d.currentFeeAmount + d.totalFeeInArrears,
        'LAST PAYMENT RECEIVED': d.lastPaymentDate ? format(new Date(d.lastPaymentDate), 'MM/dd/yyyy') : '',
        'DAYS IN ARREARS': d.daysInArreas
      };
    });

    const workbook = XLSX.utils.book_new();

    const myHeader = [
      'DEAL DATE',
      'DEAL ID',
      'DEAL PRINCIPAL',
      'DEAL FEE',
      'CUSTOMER ID',
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
      'TOTAL PRINCIPAL',
      'TOTAL FEE',
      'LAST PAYMENT RECEIVED',
      'DAYS IN ARREARS'
    ];

    const worksheet = XLSX.utils.json_to_sheet(dataFormatted, {
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
    logger.error(`[API: /get/aging2file] ${error}`);
    return res.status(500).send('FAIL');
  }
});
