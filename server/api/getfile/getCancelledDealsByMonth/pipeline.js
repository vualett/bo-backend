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
