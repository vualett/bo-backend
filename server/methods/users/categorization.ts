import { Meteor } from 'meteor/meteor';
import differenceInCalendarYears from 'date-fns/differenceInCalendarYears';
import Deals from '../../collections/deals';
import startOfYear from 'date-fns/startOfYear';
import endOfYear from 'date-fns/endOfYear';
import { queueCheckIfDealIsNotTaken } from '../../queue/queue';

export enum CategoryTypes {
  NONE = 'none',
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold'
}

type CategoryType = CategoryTypes.BRONZE | CategoryTypes.SILVER | CategoryTypes.GOLD;

function upgrade(userId: string, category: string, alert2: string): void {
  switch (category) {
    case 'bronze':
      Meteor.users.update(
        { _id: userId },
        {
          $set: {
            categorySince: new Date(),
            categoryType: 'bronze'
          }
        }
      );

      Meteor.call('timelogs.insert', {
        userId,
        event: alert2 === 'completed 1000 deal' ? 'upgraded bronze, completed 1000 deal' : 'upgraded bronze',
        type: 'account',
        eventType: 'category'
      });
      break;
    case 'silver':
      Meteor.users.update(
        { _id: userId },
        {
          $set: {
            categorySince: new Date(),
            categoryType: 'silver'
          }
        }
      );

      Meteor.call('timelogs.insert', {
        userId,
        event: alert2 === 'first categorization' ? 'first categorization' : 'upgraded silver, one year as bronze ',
        type: 'account',
        eventType: 'category'
      });
      break;
    case 'gold':
      Meteor.users.update(
        { _id: userId },
        {
          $set: {
            categorySince: new Date(),
            categoryType: 'gold'
          }
        }
      );

      Meteor.call('timelogs.insert', {
        userId,
        event:
          alert2 === 'have 1500 complete deal'
            ? 'upgraded gold, completed 1500 deal'
            : alert2 === 'have 2000 complete deal'
            ? 'upgraded gold, completed 2000 deal'
            : 'upgraded gold, one year as silver',
        type: 'account',
        eventType: 'category'
      });
      break;
  }
}
export function downgradeCategory(userId: string, category: CategoryTypes, alertDegraded: string): void {
  const categoryMap: Record<CategoryType, { type: CategoryTypes }> = {
    bronze: {
      type: CategoryTypes.NONE
    },
    silver: {
      type: CategoryTypes.BRONZE
    },
    gold: {
      type: CategoryTypes.SILVER
    }
  };

  const categoryData = categoryMap[category as CategoryType] ?? { type: CategoryTypes.NONE };

  const { type } = categoryData;

  Meteor.users.update(
    { _id: userId },
    {
      $set: {
        categorySince: new Date(),
        categoryType: type
      }
    }
  );

  Meteor.call('timelogs.insert', {
    userId,
    event: `degraded ${type}', ${alertDegraded}`,
    type: 'account',
    eventType: 'category'
  });
}

export default async function categorization(Id: string, alert: string): Promise<boolean | string> {
  const userInfo = Meteor.users.findOne(
    { _id: Id },
    {
      fields: {
        createdAt: 1,
        metrics: 1,
        firstName: 1,
        lastName: 1,
        categoryType: 1,
        categorySince: 1
      }
    }
  );

  if (alert === 'first run') {
    await queueCheckIfDealIsNotTaken({ userId: Id, schedule: 'in 3 months' });
    upgrade(Id, 'silver', 'first categorization');
    return true;
  }

  if (alert === '3 months inactive') {
    if (userInfo?.categoryType != null) {
      downgradeCategory(Id, userInfo?.categoryType, alert);
      return false;
    }
  }

  const dealInfo = await Deals.rawCollection()
    .aggregate(
      differenceInCalendarYears(new Date(), userInfo?.categorySince as Date) > 0
        ? [
            {
              $match: {
                userId: Id,
                createdAt: {
                  $gte: startOfYear(new Date()),
                  $lte: endOfYear(new Date())
                }
              }
            },
            {
              $addFields: {
                have1000: {
                  $cond: {
                    if: {
                      $eq: ['$amount', 1000]
                    },
                    then: {
                      $cond: {
                        if: {
                          $eq: ['$status', 'completed']
                        },
                        then: 1,
                        else: 0
                      }
                    },
                    else: 0
                  }
                },
                have1500: {
                  $cond: {
                    if: {
                      $eq: ['$amount', 1500]
                    },
                    then: {
                      $cond: {
                        if: {
                          $eq: ['$status', 'completed']
                        },
                        then: 1,
                        else: 0
                      }
                    },
                    else: 0
                  }
                },
                have2000: {
                  $cond: {
                    if: {
                      $gte: ['$amount', 2000]
                    },
                    then: {
                      $cond: {
                        if: {
                          $eq: ['$status', 'completed']
                        },
                        then: 1,
                        else: 0
                      }
                    },
                    else: 0
                  }
                },
                have3FailedPayments: {
                  $cond: {
                    if: {
                      $gte: ['$metrics.failedPayments', 3]
                    },
                    then: 1,
                    else: 0
                  }
                }
              }
            },
            {
              $group: {
                _id: 0,
                failedPayments: {
                  $sum: '$metrics.failedPayments'
                },
                have3FailedPayments: {
                  $last: '$have3FailedPayments'
                },
                rescheduledPayments: {
                  $sum: '$metrics.rescheduledPayments'
                },
                have1000: {
                  $sum: '$have1000'
                },
                have1500: {
                  $sum: '$have1500'
                },
                have2000: {
                  $sum: '$have2000'
                },
                countCash: {
                  $sum: 1
                },
                cashAdvances: {
                  $push: {
                    userId: '$userId',
                    amount: '$amount',
                    status: '$status',
                    rescheduledPayments: '$metrics.rescheduledPayments',
                    failedPayments: '$metrics.failedPayments'
                  }
                }
              }
            }
          ]
        : [
            {
              $match: {
                status: 'completed',
                userId: Id
              }
            },
            {
              $sort: {
                completeAt: -1
              }
            },
            {
              $limit: 1
            },
            {
              $project: {
                _id: 0,
                failedPayments: '$metrics.failedPayments',
                countCash: {
                  $sum: 1
                },
                rescheduledPayments: '$metrics.rescheduledPayments',

                have1000: {
                  $cond: {
                    if: {
                      $eq: ['$amount', 1000]
                    },
                    then: {
                      $cond: {
                        if: {
                          $eq: ['$status', 'completed']
                        },
                        then: 1,
                        else: 0
                      }
                    },
                    else: 0
                  }
                },
                have1500: {
                  $cond: {
                    if: {
                      $eq: ['$amount', 1500]
                    },
                    then: {
                      $cond: {
                        if: {
                          $eq: ['$status', 'completed']
                        },
                        then: 1,
                        else: 0
                      }
                    },
                    else: 0
                  }
                },
                have2000: {
                  $cond: {
                    if: {
                      $gte: ['$amount', 2000]
                    },
                    then: {
                      $cond: {
                        if: {
                          $eq: ['$status', 'completed']
                        },
                        then: 1,
                        else: 0
                      }
                    },
                    else: 0
                  }
                },
                have3FailedPayments: {
                  $cond: {
                    if: {
                      $gte: ['$metrics.failedPayments', 3]
                    },
                    then: 1,
                    else: 0
                  }
                }
              }
            }
          ]
    )
    .toArray();

  if (dealInfo[0] === undefined) {
    return false;
  }
  if (dealInfo[0]?.have3FailedPayments >= 1) {
    if (userInfo?.categoryType != null) {
      const text1 = 'has 3 failed payments';
      downgradeCategory(Id, userInfo?.categoryType, text1);
    }
    return false;
  }

  // to promote to gold
  if (
    (differenceInCalendarYears(new Date(), userInfo?.createdAt as Date) >= 2 &&
      dealInfo[0].have3FailedPayments < 1 &&
      differenceInCalendarYears(new Date(), userInfo?.categorySince as Date) > 0 &&
      userInfo?.categoryType === 'silver') ||
    dealInfo[0].have1500 > 0 ||
    dealInfo[0].have2000 > 0
  ) {
    if (userInfo?.categoryType === CategoryTypes.GOLD) return true;
    const text =
      dealInfo[0].have1500 > 0
        ? 'have 1500 complete deal'
        : dealInfo[0].have2000 > 0
        ? 'have 2000 complete deal'
        : 'one year has a silver';
    upgrade(Id, 'gold', text);
    return true;
  }

  // to promote to silver
  if (
    differenceInCalendarYears(new Date(), userInfo?.createdAt as Date) >= 2 &&
    dealInfo[0].have3FailedPayments < 1 &&
    differenceInCalendarYears(new Date(), userInfo?.categorySince as Date) > 0 &&
    userInfo?.categoryType === 'bronze'
  ) {
    if (userInfo?.categoryType === CategoryTypes.SILVER) return true;
    const text = 'one year as bronze';
    upgrade(Id, 'silver', text);
    return true;
  }

  // to promote to bronze
  if (
    (differenceInCalendarYears(new Date(), userInfo?.createdAt as Date) > 1 &&
      dealInfo[0].have3FailedPayments < 1 &&
      dealInfo[0].countCash >= 1 &&
      userInfo?.categoryType === undefined) ||
    (userInfo?.categoryType === undefined && dealInfo[0].have1000 > 0)
  ) {
    if (userInfo?.categoryType === CategoryTypes.BRONZE) return true;
    const text = dealInfo[0].have1000 > 0 ? 'completed 1000 deal' : '';
    upgrade(Id, 'bronze', text);
    return true;
  }
  return false;
}

Meteor.methods({ 'users.categorization': categorization });
