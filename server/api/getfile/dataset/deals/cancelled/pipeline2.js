const pipeline = [
  {
    $match: {
      status: 'cancelled'
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
    $addFields: {
      month: {
        $month: '$activateAt'
      },
      year: {
        $year: '$activateAt'
      }
    }
  },
  {
    $addFields: {
      reason: 'failed'
    }
  }
];

export default (dates) => {
  pipeline[0].$match.activateAt = { $gte: dates.start, $lt: dates.end };
  return pipeline;
};
