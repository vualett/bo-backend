import { header, validationResult } from 'express-validator';
import XLSX from 'xlsx';
import rateLimit from 'express-rate-limit';
import { format } from 'date-fns/';
import { API } from '../../../../api';
import getFromDB from './getFromDB';
import validateDate from '../../../../../utils/validateDate';
import logger from '../../../../../logger/log';
import * as Sentry from '@sentry/node';
const limiter = rateLimit({
  windowMs: 1000 * 60,
  max: 5
});

const validations = [
  header('startdate').exists().custom(validateDate),
  header('enddate').exists().custom(validateDate)
];

const fileName = 'cancelled-deals';
const defaultBookType = 'csv';

API.get('/get/dataset/deals/cancelled', limiter, validations, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { startdate, enddate, fileformat } = req.headers;
    const booktype = fileformat || defaultBookType;

    const dates = { start: new Date(startdate), end: new Date(enddate) };

    const fileNameWithDate = `${fileName}-${format(dates.start, 'MMM_DD_YYYY')}-${format(dates.end, 'MMM_DD_YYYY')}`;
    res.setHeader('Content-Disposition', `attachment; filename=${fileNameWithDate}.${booktype}`);

    if (booktype === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
      res.setHeader('Content-Type', 'application/csv');
    }

    const data = await getFromDB(dates);

    const dataFormated = data.map((d) => ({
      CASHADVANCE_ID: d._id,
      TRANSFER_DATE: format(d.activateAt, 'MM/DD/YYYY'),
      CANCELLATION_REASON: d.reason,
      PRINCIPAL: d.amount,
      PRINCIPAL_PLUS_FEE: d.totalAmount
    }));

    const ws = XLSX.utils.json_to_sheet(dataFormated);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, fileName);

    return res.status(200).send(XLSX.write(wb, { type: 'buffer', bookType: booktype }));
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`[API:/get/dataset/deals/cancelled]${error}`);
    return res.status(500).send('FAIL');
  }
});
