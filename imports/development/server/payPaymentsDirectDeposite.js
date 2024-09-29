import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../../server/utils/security';
import Deals from '../../../server/collections/deals';
import logger from '../../../server/logger/log';
import { capitalizeFirstLetterOfEachWord } from '../../../server/utils/utils';

async function paySchedulePaymentsDD(userID) {
  this.unblock();
  Security.checkIfAdmin(this.userId);
  check(userID, String);

  try {
    const user = Meteor.users.findOne({ _id: this.userId });

    const by = {
      name: capitalizeFirstLetterOfEachWord(user.firstName),
      id: this.userId
    };

    if (!user) {
      throw new Meteor.Error('USER_NOT_FOUND');
    }

    const userDeals = await Deals.find({ userId: userID }).fetchAsync();

    const latestDeal = userDeals[userDeals.length - 1];

    if (!latestDeal) {
      throw new Meteor.Error('DEAL_NOT_FOUND');
    }

    if (latestDeal.status !== 'active') {
      throw new Meteor.Error('DEAL_STATUS_NOT_ACTIVE');
    }

    const scheduled = latestDeal.payments.filter((p) => p.status === 'schedule');

    if (!scheduled.length) {
      throw new Meteor.Error('DEAL_DOES_NOT_HAVE_SCHEDULED_PAYMENTS');
    }

    for (const payment of scheduled) {
      await Deals.updateAsync(
        { _id: latestDeal._id, 'payments.number': payment.number },
        {
          $set: {
            'payments.$.status': 'paid',
            'payments.$.paidAt': new Date(),
            'payments.$.directDeposit': true,
            'payments.$.directDepositReference': 'automaticReference'
          }
        }
      );

      Meteor.call('notes.insert', {
        message: `Direct deposit on remittance ${payment.number}`,
        where: 'user',
        userId: latestDeal.userId,
        by
      });
    }
  } catch (error) {
    logger.error(`_dev.users.paySchedulePaymentsDD[${userID}]${error}`);
    return false;
  }
}

Meteor.methods({
  '_dev.users.paySchedulePaymentsDD': paySchedulePaymentsDD
});
