import { Meteor } from 'meteor/meteor';
import isPast from 'date-fns/isPast';
import max from 'date-fns/max';
import Deals from '../../collections/deals';
import { flatten } from '../../utils/utils';
import Security from '../../utils/security';
import { Settings } from '../../collections/settings';
import { differenceInCalendarDays, startOfMonth } from 'date-fns';

function getOverduePipeline(filterDate, returnCodes, sort) {
  return [
    {
      $match: {
        status: 'active'
      }
    },
    {
      $addFields: {
        dateInOverdue: {
          $toDate: '$dateInOverdue'
        }
      }
    },
    {
      $match: {
        dateInOverdue: {
          $gte: new Date(filterDate.startDate),
          $lte: new Date(filterDate.endDate)
        }
      }
    },
    {
      $match: {
        'payments.status': { $in: ['schedule', 'declined'] },
        ...(returnCodes
          ? {
              'payments.returnCode': { $in: returnCodes }
            }
          : {})
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              firstName: 1,
              lastName: 1
            }
          }
        ],
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    ...(sort ? [{ $sort: sort }] : [])
  ];
}

function getErrMsgPaymentInitPipeline(filterDate, sort) {
  return [
    {
      $match: {
        status: 'active',
        payments: {
          $elemMatch: {
            errorMessage: {
              $exists: true
            },
            date: {
              $gte: new Date(filterDate.startDate),
              $lte: new Date(filterDate.endDate)
            }
          }
        }
      }
    },
    {
      $unwind: {
        path: '$payments'
      }
    },
    {
      $match: {
        'payments.errorMessage': {
          $exists: true
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              firstName: 1,
              lastName: 1
            }
          }
        ],
        as: 'user'
      }
    },
    {
      $project: {
        userId: 1,
        firstName: {
          $arrayElemAt: ['$user.firstName', 0]
        },
        lastName: {
          $arrayElemAt: ['$user.lastName', 0]
        },
        paymentNumber: '$payments.number',
        errorMessage: '$payments.errorMessage'
      }
    },
    ...(sort ? [{ $sort: sort }] : [])
  ];
}

function process(data) {
  const payments = flatten(data.map((d) => d.payments));

  const overduePayments = payments.filter(
    (p) => !['paid', 'pending'].includes(p.status) && new Date(p.date) < new Date()
  );

  const totalOverdueAmount = overduePayments.map((p) => p.amount).reduce((a, b) => a + b, 0);

  const totalOverdueFee = overduePayments.map((p) => p.fee).reduce((a, b) => a + b, 0) / 100;

  const totalOverduePrincipalAmount = overduePayments.map((p) => p.principal).reduce((a, b) => a + b, 0);

  const cashAdvanceCount = data.length;

  const _cashAdvancePastTerms = data.filter((ca) => {
    const paymentDates = ca.payments.map((d) => d.date);
    const lastestDate = max.apply(this, paymentDates);
    return isPast(lastestDate);
  });

  return {
    totalOverdueAmount,
    cashAdvanceCount,
    totalOverdueFee,
    totalOverduePrincipalAmount,
    cashAdvancePastTerms: { count: _cashAdvancePastTerms.length }
  };
}

export default function transform(doc) {
  const capitalPerPayment = doc.amount / doc.numberOfPayments;

  function paid() {
    const payments = doc.payments.filter((p) => p.status === 'paid');
    const total = payments.map((p) => p.amount).reduce((a, b) => a + b, 0);

    return {
      count: payments.length,
      total
    };
  }

  const overduePayments = doc.payments
    .filter((p) => p.status !== 'paid' && p.status !== 'pending')
    .filter((p) => isPast(new Date(p.date)))
    .map((p) => ({
      ...p,
      fee: p.amount - capitalPerPayment,
      principal: capitalPerPayment,
      resqueduled: !!p.originalDate,
      daysInOverdue: differenceInCalendarDays(new Date(), new Date(p.date))
    }));

  const user = Meteor.users.findOne({ _id: doc.userId }, { fields: { firstName: 1, lastName: 1 } });

  return {
    ...doc,
    overduePayments,
    withOverdueOver120: overduePayments.some(({ daysInOverdue }) => daysInOverdue > 120),
    paid: paid().count,
    user
  };
}

export async function addOverdueMetrics() {
  const filterDate = {
    startDate: startOfMonth(new Date()),
    endDate: new Date()
  };

  const defaultDeals = await Deals.rawCollection()
    .aggregate([...getOverduePipeline(filterDate)])
    .toArray();

  Settings.upsert(
    { _id: 'overdueMetrics' },
    {
      $set: {
        value: {
          default: process(defaultDeals),
          updatedAt: new Date()
        }
      }
    }
  );
}

function getOverdueMetrics() {
  return Settings.findOne({ _id: 'overdueMetrics' });
}

async function forOverduePaginated({ filterDate, returnCodes, sort, limit = 0, skip = 0 }) {
  const results = await Deals.rawCollection()
    .aggregate([
      {
        $facet: {
          deals: [...getOverduePipeline(filterDate, returnCodes, sort), { $skip: skip }, { $limit: limit }],
          total: [...getOverduePipeline(filterDate, returnCodes), { $count: 'total' }]
        }
      }
    ])
    .toArray();

  const { deals, total } = results[0];

  return {
    result: deals.map((deal) => {
      return {
        ...deal,
        returnCodes: Array.from(new Set(deal.payments.map((p) => p.returnCode || '').filter((p) => p)))
      };
    }),
    total: total.length ? total[0].total : 0
  };
}
async function errMsgPaymentInitPipeline({ filterDate, sort, limit = 0, skip = 0 }) {
  const results = await Deals.rawCollection()
    .aggregate([
      {
        $facet: {
          deals: [...getErrMsgPaymentInitPipeline(filterDate, sort), { $skip: skip }, { $limit: limit }],
          total: [...getErrMsgPaymentInitPipeline(filterDate, sort), { $count: 'total' }]
        }
      }
    ])
    .toArray();
  const { deals, total } = results[0];
  return {
    result: deals,
    total: total.length ? total[0].total : 0
  };
}
Meteor.methods({
  'accounting.overduePaginated': async function withOverduePaginatedMethod(params) {
    Security.checkIfAdmin(this.userId);

    return await forOverduePaginated(params);
  },
  'accounting.errMsgPayments': async function withErrMsgPayments(params) {
    Security.checkIfAdmin(this.userId);

    return await errMsgPaymentInitPipeline(params);
  },
  'accounting.overdueMetrics': function overdueMetricsMethod() {
    Security.checkIfAdmin(this.userId);

    return getOverdueMetrics();
  }
});
