import XLSX from 'xlsx';
import rateLimit from 'express-rate-limit';
import { API } from '../../api';
import Deals from '../../../collections/deals';
import pipeline from './pipeline';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';
const limiter = rateLimit({
  windowMs: 1000 * 60, // 1 min
  max: 5 // limit each IP to 1 requests per windowMs
});

async function getFromDB() {
  const deals = await Deals.rawCollection().aggregate(pipeline).toArray();

  return deals;
}
const fileName = 'payments';

API.get('/get/paymentsbymonth', limiter, async (req, res) => {
  res.setHeader('Content-Type', 'application/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}.csv`);

  try {
    const data = await getFromDB();

    const dataFormated = data.map((d) => ({
      date: d.date,
      count: d.paymentsCount,
      Total: d.totalAmount,
      ' ': ' ',
      bonuses: d.bonusPaid
    }));

    const ws = XLSX.utils.json_to_sheet(dataFormated);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, fileName);

    return res.status(200).send(XLSX.write(wb, { type: 'buffer', bookType: 'csv' }));
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`[API:/get/paymentsbymonth] ${error}`);
    return res.status(500).send('FAIL');
  }
});
