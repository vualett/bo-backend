import { Meteor } from 'meteor/meteor';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { API } from '../../api';
import Deals from '../../../collections/deals';
import { dealTransform } from '../docTransform';
import getDateRange from '../getDateRange';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';
import { EXPORT_METHOD_SECRET } from '../../../keys';
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minutes
  max: 10 // limit each IP to 10 requests per windowMs
});

API.get('/datareport', cors(), limiter, (req, res) => {
  const { token, daterange, firstdate, lastdate, filter, dealdateoperator } = req.headers;

  const dealQuery = { status: { $nin: ['cancelled', 'completed'] } };
  const dealHistoryQuery = { status: 'completed' };

  let usersQuery = {};
  const usersOptions = {
    fields: {
      firstName: 1,
      lastName: 1,
      phone: 1,
      address: 1,
      business: 1,
      createdAt: 1,
      status: 1,
      metrics: 1,
      isPromoter: 1,
      isSubPromoter: 1,
      promoterType: 1,
      currentCashAdvance: 1,
      invitedBy: 1,
      verifiedDate: 1,
      lastCall: 1,
      'bankAccount.bankName': 1
    }
  };

  const dealOptions = {
    fields: {
      idempotencyKey: 0,
      transferUrl: 0,
      product_name: 0,
      numberOfPayments: 0,
      termsOfPayment: 0
    },
    transform: dealTransform
  };

  if (filter) {
    usersOptions.fields = {
      firstName: 1,
      lastName: 1,
      business: 1,
      createdAt: 1,
      status: 1,
      metrics: 1,
      isPromoter: 1,
      isSubPromoter: 1,
      promoterType: 1,
      currentCashAdvance: 1,
      invitedBy: 1,
      verifiedDate: 1
    };
    dealOptions.fields = {
      idempotencyKey: 0,
      transferUrl: 0,
      product_name: 0,
      numberOfPayments: 0,
      termsOfPayment: 0,
      fee: 0,
      lock: 0,
      payments: 0,
      preApprovedAt: 0
    };
  }

  const { startDate, endDate } =
    firstdate && lastdate
      ? getDateRange({ start: firstdate, end: lastdate })
      : getDateRange(daterange, { adjustTimeZone: true });

  try {
    if (EXPORT_METHOD_SECRET !== token) {
      res.status(401).send(
        JSON.stringify({
          status: 'error',
          error: 'not-authorized'
        })
      );
    }

    if (daterange) {
      if (dealdateoperator) {
        dealQuery[dealdateoperator] = { $gte: startDate, $lt: endDate };
      } else {
        dealQuery.approvedAt = { $gte: startDate, $lt: endDate };
      }

      dealHistoryQuery.completeAt = { $gte: startDate, $lt: endDate };
      usersQuery = {
        type: 'user',
        createdAt: { $gte: startDate, $lt: endDate }
      };
    }

    const deals = Deals.find(dealQuery, dealOptions).fetch();
    const dealsHistory = Deals.find(dealHistoryQuery, dealOptions).fetch();
    const users = Meteor.users.find(usersQuery, usersOptions).fetch();

    res.status(200).send(
      JSON.stringify({
        status: 'success',
        date_range: {
          startDate: startDate.toString(),
          endDate: endDate.toString()
        },
        data: { users, deals, dealsHistory }
      })
    );
  } catch (error) {
    logger.error(`[API:/datareport] ${error}`);
    Sentry.captureException(error);
    res.status(400).send({ status: 'fail', message: '' });
  }
});
