const pipeline = [
  {
    $match: {
      status: {
        $in: ['active', 'completed', 'suspended']
      }
    }
  },
  {
    $sort: {
      activateAt: 1
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
    $group: {
      _id: {
        month: '$month',
        year: '$year'
      },
      cashAdvanceCount: {
        $sum: 1
      },
      cashAdvancTotalPrincipal: {
        $sum: '$amount'
      },
      cashAdvancTotalPrincipalPlusFee: {
        $sum: '$totalAmount'
      }
    }
  },
  {
    $addFields: {
      date: {
        $dateFromParts: {
          year: '$_id.year',
          month: '$_id.month'
        }
      }
    }
  },
  {
    $sort: {
      date: 1
    }
  }
];

export default pipeline;
