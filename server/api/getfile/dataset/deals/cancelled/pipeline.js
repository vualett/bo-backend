const pipeline = [
  {
    $match: {
      status: 'completed'
    }
  },
  {
    $addFields: {
      paymentsCount: {
        $size: '$payments'
      }
    }
  },
  {
    $addFields: {
      feeAmount: {
        $multiply: ['$amount', '$fee']
      }
    }
  },
  {
    $addFields: {
      totalAmount: {
        $sum: ['$amount', '$feeAmount']
      }
    }
  },
  {
    $match: {
      paymentsCount: {
        $eq: 1
      }
    }
  },
  {
    $addFields: {
      payments: {
        $arrayElemAt: ['$payments', 0]
      }
    }
  },
  {
    $addFields: {
      paidAmountEqPrincipal: {
        $eq: ['$payments.amount', '$amount']
      }
    }
  },
  {
    $match: {
      'payments.status': 'paid',
      paidAmountEqPrincipal: true
    }
  },
  {
    $addFields: {
      reason: 'customer'
    }
  }
];

export default (dates) => {
  pipeline[0].$match.activateAt = { $gte: dates.start, $lt: dates.end };
  return pipeline;
};
