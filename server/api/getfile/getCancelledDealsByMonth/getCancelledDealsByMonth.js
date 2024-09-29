import XLSX from 'xlsx';
import { format } from 'date-fns';
import rateLimit from 'express-rate-limit';
import { API } from '../../api';
import Deals from '../../../collections/deals';
import pipeline from './pipeline';
import pipeline2 from './pipeline2';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';
const limiter = rateLimit({
  windowMs: 1000 * 60, // 1 min
  max: 5 // limit each IP to 1 requests per windowMs
});

async function getFromDB() {
  // cancelled from one total payment
  const deals = await Deals.rawCollection().aggregate(pipeline).toArray();

  // cancelled from failed transfer
  const deals2 = await Deals.rawCollection().aggregate(pipeline2).toArray();

  const merged = [];

  [...deals, ...deals2].forEach((el) => {
    if (!merged[el.date]) {
      merged[el.date] = el;
    } else {
      merged[el.date].count += el.count;
      merged[el.date].totalPrincipal += el.totalPrincipal;
      merged[el.date].totalPrincipalPlusFee += el.totalPrincipalPlusFee;
    }
  });

  return Object.values(merged).sort((a, b) => a.date - b.date);
}

const fileName = 'cancelled-deals';

API.get('/get/cancelleddealsbymonth', limiter, async (req, res) => {
  res.setHeader('Content-Type', 'application/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}.csv`);

  try {
    const data = await getFromDB();

    const dataFormated = data.map((d) => ({
      date: format(d.date, 'yyyy/MM/dd'),
      count: d.count,
      TotalPrincipal: d.totalPrincipal,
      TotalPrincipalPlusFee: d.totalPrincipalPlusFee
    }));

    const ws = XLSX.utils.json_to_sheet(dataFormated);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, fileName);

    return res.status(200).send(XLSX.write(wb, { type: 'buffer', bookType: 'csv' }));
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`[API:/get/cancelleddealsbymonth]${error}`);
    return res.status(500).send('FAIL');
  }
});
