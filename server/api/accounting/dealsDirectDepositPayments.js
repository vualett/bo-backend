// import MongoPaging from 'mongo-cursor-pagination';
import { parse } from 'date-fns';
import Deals from '../../collections/deals';
import { dealTransform } from './docTranforms';
import { flatten } from '../../utils/utils';
import getDateRange from '../external/getDateRange';
import { API } from '../api';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';
// const DealsCollection = Deals.rawCollection();
// const LIMIT = 200;

API.get('/api/accounting/directpayments', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const { range, firstdate, lastdate } = req.query;

  const dates = {
    start: new Date('2018/06/01'),
    end: new Date()
  };

  if (range || (firstdate && lastdate)) {
    const { startDate, endDate } =
      firstdate && lastdate
        ? getDateRange({
            start: parse(firstdate, 'YYYYMMDD'),
            end: parse(lastdate, 'YYYYMMDD')
          })
        : getDateRange(range);
    dates.start = startDate;
    dates.end = endDate;
  }

  try {
    const query = {
      $and: [
        { status: { $in: ['active', 'suspended', 'completed'] } },
        {
          payments: {
            $elemMatch: {
              status: 'paid',
              directDeposit: true,
              paidAt: {
                $gte: dates.start,
                $lt: dates.end
              }
            }
          }
        }
      ]
    };

    // const results = await MongoPaging.find(DealsCollection, {
    //   query,
    //   limit: LIMIT,
    //   next: req.query.next,
    //   previous: req.query.previous,
    //   paginatedField: 'paidAt',
    // });

    const results = {
      results: Deals.find(query).fetch(),
      previous: false,
      hasPrevious: false,
      next: false,
      hasNext: false
    };

    results.results = results.results.map((doc) =>
      dealTransform(doc, {
        payments: true,
        customer: false,
        directDeposit: true
      })
    );

    const paymentsMapped = results.results
      .filter((d) => d)
      .map((d) => {
        const capitalPerPayment = d.amount / d.numberOfPayments;

        const filtered = d.payments
          .filter((p) => p.status === 'paid' && p.directDeposit)
          .filter((payment) => {
            const date = new Date(payment.paidAt);
            return date >= dates.start && date <= dates.end;
          });

        return filtered.map((p) => ({
          paymentNumber: p.number,
          cashAdvanceID: d.cashAdvanceID,
          userID: d.userId,
          fee: p.amount - capitalPerPayment,
          principal: capitalPerPayment,
          amount: p.amount,
          date: p.paidAt,
          transferID: p.idempotencyKey,
          status: p.status,
          bonus: p.bonus || false
        }));
      });

    results.results = flatten(paymentsMapped);

    res.status(200).send(
      JSON.stringify({
        status: 'success',
        range: dates,
        count_in_this_list: results.results.length,
        results: results.results
      })
    );

    // res.status(200).send(
    //   JSON.stringify({
    //     status: 'success',
    //     range: dates,
    //     previous: results.previous,
    //     hasPrevious: results.hasPrevious,
    //     next: results.next,
    //     hasNext: results.hasNext,
    //     results: results.results,
    //   }),
    // );
  } catch (error) {
    logger.error(`[API:api/accounting/directpayments] ${error}`);
    Sentry.captureException(error);
    res.status(400).send({ status: 'fail', message: '' });
  }
});
