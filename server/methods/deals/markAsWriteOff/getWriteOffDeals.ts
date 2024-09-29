import { Meteor } from 'meteor/meteor';
import Deals from '../../../collections/deals';
import logger from '../../../logger/log';
import { format } from 'date-fns';
import Security from '../../../utils/security';
import { ENV } from '../../../keys';

export async function isCollected(id: string) {
  Security.checkIfAdmin(Meteor.userId());
  try {
    const deal = await Deals.find({
      userId: id,
      toCollection: true
    }).count();

    if (deal >= 1) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    const { message } = error as Error;
    logger.error(`deals.isCollected ${message}`);
  }
}
export async function quitAllIsCollected() {
  try {
    if (Meteor.isDevelopment || ENV === 'staging') {
      Deals.update(
        { toCollection: true },
        {
          $set: {
            toCollection: false
          }
        },
        {
          multi: true
        }
      );
    } else {
      return false;
    }
  } catch (error) {
    const { message } = error as Error;
    logger.error(`deals.quitAllIsCollected ${message}`);
  }
}

export async function quitCollected(id: string) {
  Security.checkRole(Meteor.userId(), ['technical']);
  try {
    Deals.update(
      { _id: id },
      {
        $set: {
          toCollection: false
        }
      }
    );
  } catch (error) {
    const { message } = error as Error;
    logger.error(`deals.quitCollected ${message}`);
  }
}
export async function insertInformation(Id: string, firstName: string) {
  try {
    await Deals.update(
      {
        writeOffAt: {
          $exists: true
        },
        status: 'closed',
        $or: [
          {
            toCollection: {
              $exists: false
            }
          },
          {
            toCollection: false
          }
        ]
      },
      {
        $set: {
          toCollectionInformation: {
            batchNumber: format(new Date(), 'yyyy/MM/dd'),
            name: firstName,
            id: Id
          },
          toCollection: true
        }
      },
      {
        multi: true
      }
    );

    return format(new Date(), 'yyyy/MM/dd');
  } catch (error) {
    const { message } = error as Error;
    logger.error(`deals.insertInformation ${message}`);
  }
}

export async function getWriteOff() {
  try {
    Security.checkIfAdmin(Meteor.userId());

    const deals = Deals.rawCollection()
      .aggregate([
        {
          $match: {
            writeOffAt: {
              $exists: true
            },
            status: 'closed'
          }
        },
        {
          $addFields: {
            notPaid: {
              $filter: {
                input: '$payments',
                as: 'filter',
                cond: {
                  $ne: ['$$filter.status', 'paid']
                }
              }
            },
            PaidAfterWriteOff: {
              $filter: {
                input: '$payments',
                as: 'filter',
                cond: {
                  $gt: ['$$filter.paidAt', '$writeOffAt']
                }
              }
            }
          }
        },
        {
          $addFields: {
            principalBalanceOnTheItemizationDate: {
              $reduce: {
                input: '$notPaid',
                initialValue: 0,
                in: {
                  $add: ['$$this.principal', '$$value']
                }
              }
            },
            feesAfterItemizationDate: {
              $reduce: {
                input: '$notPaid',
                initialValue: 0,
                in: {
                  $add: ['$$this.fee', '$$value']
                }
              }
            }
          }
        },
        {
          $match: {
            $and: [
              {
                principalBalanceOnTheItemizationDate: {
                  $ne: 0
                }
              },
              {
                feesAfterItemizationDate: {
                  $ne: 0
                }
              }
            ]
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            accountNumber: '$userId',
            transactionId: '$_id',
            creditor: 'Ualett',

            firstName: {
              $arrayElemAt: ['$user.firstName', 0]
            },
            lastName: {
              $arrayElemAt: ['$user.lastName', 0]
            },
            emailAddress: {
              $arrayElemAt: ['$user.emails.address', 0]
            },
            phoneNumber: {
              $arrayElemAt: ['$user.phone.number', 0]
            },
            phoneNumberType: 'mobile',
            streetAddress: {
              $arrayElemAt: ['$user.address.street1', 0]
            },
            city: {
              $arrayElemAt: ['$user.address.city', 0]
            },
            state: {
              $arrayElemAt: ['$user.address.state', 0]
            },
            zipCode: {
              $arrayElemAt: ['$user.address.postal_code', 0]
            },
            originationDate: {
              $dateToString: {
                format: '%m/%d/%Y',
                date: '$activateAt'
              }
            },
            defaultDate: {
              $dateToString: {
                format: '%m/%d/%Y',
                date: '$writeOffAt'
              }
            },
            chargeoffDate: {
              $dateToString: {
                format: '%m/%d/%Y',
                date: '$writeOffAt'
              }
            },
            dateOfLastPayment: {
              $dateToString: {
                format: '%m/%d/%Y',
                date: {
                  $max: '$payments.date'
                }
              }
            },
            dateOfLastTransaction: {
              $dateToString: {
                format: '%m/%d/%Y',
                date: {
                  $max: '$payments.paidAt'
                }
              }
            },
            itemizationDate: {
              $dateToString: {
                format: '%m/%d/%Y',
                date: '$writeOffAt'
              }
            },
            principalBalanceOnTheItemizationDate: 1,
            interestAfterItemizationDate: '0',
            feesAfterItemizationDate: 1,
            creditOrPaymentsAfterItemizationDate: '0',
            amountDueAtchargeOff: {
              $reduce: {
                input: '$notPaid',
                initialValue: 0,
                in: {
                  $add: ['$$this.amount', '$$value']
                }
              }
            },
            interestAccruedSincechargeOf: '0',
            NonInterestFeesAccruedSinceChargeOff: '0',
            amountPaidSinceChargeOf: {
              $reduce: {
                input: '$PaidAfterWriteOff',
                initialValue: 0,
                in: {
                  $add: ['$$this.amount', '$$value']
                }
              }
            }
          }
        }
      ])
      .toArray();

    // check(userId, string);
    // check(firstName, string);

    return {
      WriteOffs: await deals,
      batchNumber: format(new Date(), 'yyyy/MM/dd')
    };
  } catch (error) {
    const { message } = error as Error;
    logger.error(`deals.getWriteOff ${message}`);
  }
}

export async function getDataTotable() {
  try {
    Security.checkIfAdmin(Meteor.userId());
    const deals = Deals.rawCollection()
      .aggregate([
        {
          $match: {
            writeOffAt: {
              $exists: true
            },
            status: 'closed',
            $or: [
              {
                toCollection: {
                  $exists: false
                }
              },
              {
                toCollection: false
              }
            ]
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            accountNumber: '$userId',
            transactionId: '$_id',
            creditor: 'Ualett',
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            emailAddress: '$user.emails.address',
            phoneNumber: '$user.phone.number',
            streetAddress: '$user.address.street1',
            city: '$user.address.city',
            state: '$user.address.state',
            zipCode: '$user.address.postal_code',
            originalDate: '$activateAt',
            defaultDate: '$writeOffAt',
            changeoffDate: '$writeOffAt',
            dateOfLastPayment: {
              $max: '$payments.date'
            },
            dateOfLastTransaction: {
              $ifNull: [
                {
                  $max: '$payments.paidAt'
                },
                'NA'
              ]
            }
          }
        },
        {
          $limit: 20
        }
      ])
      .toArray();

    // check(userId, string);
    // check(firstName, string);

    return await deals;
  } catch (error) {
    const { message } = error as Error;
    logger.error(`deals.WriteOffData ${message}`);
  }
}

Meteor.methods({
  'deals.getWriteOff': getWriteOff,
  'deals.insertToCollection': insertInformation,
  'deals.quitAllIsCollected': quitAllIsCollected,
  'deals.isCollected': isCollected,
  'deals.WriteOffData': getDataTotable,
  'deals.quitCollected': quitCollected
});
