import { Meteor } from 'meteor/meteor';
import updateInteraction from '../updateInteraction';
import Deals from '../../../collections/deals';
import { differenceInDays } from 'date-fns';
import * as Sentry from '@sentry/node';
import insertLog from '../../logs/insertGenericLog';
import { insertTimelog } from '../../timelogs/insertTimelog';

export default async function automaticReactivation(user: Meteor.User): Promise<boolean | undefined> {
  try {
    const previousCategory: string | undefined = user?.previousCategory;

    if (!previousCategory) {
      insertLog(user?._id, 'SYSTEM: DID NOT REACTIVE BECAUSE AUTOMATIC REACTIVATION DOES NOT APPLY.');
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      insertTimelog({
        userId: user?._id,
        event: 'SYSTEM: DID NOT REACTIVE BECAUSE AUTOMATIC REACTIVATION DOES NOT APPLY.',
        type: 'account',
        eventType: 'user',
        metadata: {
          type: 'reactivate'
        },
        _by: { id: 'system', name: 'system' },
        dealId: ''
      });
      return;
    }

    if (previousCategory && ['2k+', 'xl'].includes(previousCategory)) {
      insertLog(user?._id, 'SYSTEM: DID NOT REACTIVE BECAUSE AUTOMATIC REACTIVATION CATEGORY LIMIT WAS EXCEEDED.');
      await insertTimelog({
        userId: user?._id,
        event: 'SYSTEM: DID NOT REACTIVE BECAUSE AUTOMATIC REACTIVATION CATEGORY LIMIT WAS EXCEEDED.',
        type: 'account',
        eventType: 'user',
        metadata: {
          type: 'reactivate'
        },
        _by: { id: 'system', name: 'system' },
        dealId: ''
      });
      return false;
    }

    const dealsUser: Meteor.Deal[] = Deals.find(
      { userId: user?._id, status: 'completed' },
      { sort: { completeAt: -1 }, limit: 2 }
    ).fetch();

    const lastDeal = dealsUser[0];
    const completeAtDate = lastDeal?.completeAt;
    const daysDifference = completeAtDate ? differenceInDays(new Date(), completeAtDate) : undefined;
    if (daysDifference !== undefined && daysDifference > 180) {
      insertLog(user?._id, 'SYSTEM: DID NOT REACTIVE BECAUSE THE CLIENT HAS MORE THAN 180 DAYS DEACTIVATED');
      await insertTimelog({
        userId: user?._id,
        event: 'SYSTEM: DID NOT REACTIVE BECAUSE THE CLIENT HAS MORE THAN 180 DAYS DEACTIVATED',
        type: 'account',
        eventType: 'user',
        metadata: {
          type: 'reactivate'
        },
        _by: { id: 'system', name: 'system' },
        dealId: ''
      });
      return false;
    }

    if (lastDeal.metrics.failedPayments > 4) {
      insertLog(user?._id, 'SYSTEM: DID NOT REACTIVE BECAUSE THE CLIENT DID NOT PAY THE DEAL WELL ');

      await insertTimelog({
        userId: user?._id,
        event: 'SYSTEM: DID NOT REACTIVE BECAUSE THE CLIENT DID NOT PAY THE DEAL WELL.',
        type: 'account',
        eventType: 'user',
        metadata: {
          type: 'reactivate'
        },
        _by: { id: 'system', name: 'system' },
        dealId: ''
      });
      return false;
    }

    await updateInteraction({
      userId: user?._id,
      status: 'reactivated',
      flow: 'validation',
      by: { id: 'system', name: 'system' },
      hasUpdateDealInteraction: true,
      note: undefined,
      userAdmin: undefined,
      duplicatedAccountId: undefined,
      reevaluationDate: null,
      callbackDate: null
    });

    insertLog(user?._id, `REACTIVATED: ${user?.previousCategory?.toUpperCase() ?? 'REACTIVATED'}`, null, 'status');

    Meteor.users.update(
      { _id: user?._id },
      {
        $set: {
          category: previousCategory
        }
      }
    );

    await insertTimelog({
      userId: user?._id,
      event: 'system reactivation',
      type: 'account',
      eventType: 'user',
      metadata: {
        type: 'account'
      },
      _by: { id: 'system', name: 'system' },
      dealId: undefined
    });

    return true;
  } catch (error: unknown) {
    Sentry.captureException(error);
  }
}
