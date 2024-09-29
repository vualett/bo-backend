/* eslint-disable dot-notation */
import XLSX from 'xlsx';
import { format } from 'date-fns';
import rateLimit from 'express-rate-limit';
import { API } from '../../api';
import getAgingDBData from './getDBData';
import processData from './processData';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';
import { API_SECRETS_DATA_TAPE } from '../../../keys';
const limiter = rateLimit({
  windowMs: 1000 * 60, // 1 min
  max: 5 // limit each IP to 1 requests per windowMs
});

const fileName = 'aging_payments';

export default async function getData(dates) {
  if (!dates) return false;

  const data = await getAgingDBData(dates);

  return processData(data);
}

API.get('/get/agingpayments/xlsx', limiter, async (req, res) => {
  const { secret, startdate } = req.headers;
  const dates = { start: startdate || '2020/01/01' };

  if (secret !== API_SECRETS_DATA_TAPE) return res.status(401).send('NOT-AUTHORIZED');

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}-${format(dates.start, 'MMM_DD_YYYY')}.xlsx`);
  try {
    const data = await getData(dates);

    const dataFormated = data.map((d) => ({
      MONTH: d.month,
      'TOTAL BALANCE': d.all.totalPrincipalAmount,
      CURRENT: d.current.totalPrincipalAmount,
      '1 IN ARREARS': d.onePaymentsInArrears.totalPrincipalAmount,
      '2 IN ARREARS': d.twoPaymentsInArrears.totalPrincipalAmount,
      '3 OR MORE IN ARREARS': d.threeOrMorePaymentsInArrears.totalPrincipalAmount
    }));

    const dataFormated2 = data.map((d) => ({
      MONTH: d.month,
      'TOTAL BALANCE': d.all.totalFeeAmount,
      CURRENT: d.current.totalFeeAmount,
      '1 IN ARREARS': d.onePaymentsInArrears.totalFeeAmount,
      '2 IN ARREARS': d.twoPaymentsInArrears.totalFeeAmount,
      '3 OR MORE IN ARREARS': d.threeOrMorePaymentsInArrears.totalFeeAmount
    }));

    const workbook = XLSX.utils.book_new();

    const myHeader = ['MONTH', 'TOTAL BALANCE', 'CURRENT', '1 IN ARREARS', '2 IN ARREARS', '3 OR MORE IN ARREARS'];

    const worksheet = XLSX.utils.json_to_sheet(dataFormated, {
      header: myHeader
    });
    const worksheet2 = XLSX.utils.json_to_sheet(dataFormated2, {
      header: myHeader
    });

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    range.e['c'] = myHeader.length - 1;
    worksheet['!ref'] = XLSX.utils.encode_range(range);

    XLSX.utils.book_append_sheet(workbook, worksheet, 'aging-principal');
    XLSX.utils.book_append_sheet(workbook, worksheet2, 'aging-fee');

    return res.status(200).send(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  } catch (error) {
    logger.error(`[API:/get/agingpayments/xlsx]${error}`);
    Sentry.captureException(error);
    return res.status(500).send('FAIL');
  }
});
