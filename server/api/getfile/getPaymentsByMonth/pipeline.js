const pipeline = [
  {
    $match: {
      status: {
        $in: ['active', 'suspended', 'completed']
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
      paymentsPaid: {
        $filter: {
          input: '$payments',
          as: 'payment',
          cond: {
            $eq: ['$$payment.status', 'paid']
          }
        }
      }
    }
  },
  {
    $unwind: {
      path: '$paymentsPaid'
    }
  },
  {
    $replaceRoot: {
      newRoot: '$paymentsPaid'
    }
  },
  {
    $addFields: {
      month: {
        $month: '$paidAt'
      },
      year: {
        $year: '$paidAt'
      }
    }
  },
  {
    $group: {
      _id: {
        month: '$month',
        year: '$year'
      },
      paymentsCount: {
        $sum: 1
      },
      totalAmount: {
        $sum: '$amount'
      },
      bonusPaid: {
        $sum: '$bonus'
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
