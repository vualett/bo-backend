const pipeline = [
  {
    $match: {
      status: 'cancelled',
      activateAt: {
        $exists: true
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
      count: {
        $sum: 1
      },
      totalPrincipal: {
        $sum: '$amount'
      },
      totalPrincipalPlusFee: {
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
