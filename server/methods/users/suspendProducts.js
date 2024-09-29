/* eslint-disable import/no-duplicates */
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../utils/security';
import addWeeks from 'date-fns/addWeeks';
import insertLog from '../logs/insertGenericLog';
import { insertDataChangesLog } from '../../dataChangesLogs';
import { queueEndSuspension } from '../../queue/queue';
import Queue from '../../queue/queue';
import updateInteraction from './updateInteraction';

async function suspendProducts({ userId, weeks }) {
  check(userId, String);
  check(weeks, Number);

  const client = Meteor.users.findOne({ _id: userId });
  if (client?.reactivationHold) throw new Meteor.Error('Error', 'Have reactivation hold active ');

  const update = Meteor.users.update(
    { _id: userId },
    {
      $set: {
        previousCategory: client.category,
        category: 'none',
        suspendedTill: addWeeks(new Date(), weeks)
      }
    }
  );

  if (update) {
    updateInteraction({
      userId,
      status: 'suspended',
      by: {
        name: 'system'
      },
      flow: 'repetition'
    });

    Meteor.call('timelogs.insert', {
      userId,
      event: 'products suspended',
      type: 'account',
      eventType: 'user',
      metadata: {
        weeks,
        type: 'suspended'
      }
    });

    insertLog(userId, `SUSPENDED FOR ${weeks} WEEKS`);

    queueEndSuspension({ userId, weeks });

    return true;
  }
}

async function removeProductSuspension({ userId, category }) {
  Security.checkRole(this.userId, ['super-admin', 'admin', 'validation']);
  const executed = Meteor.users.update(
    { _id: userId },
    {
      $unset: { suspendedTill: '' },
      $set: { category }
    }
  );

  updateInteraction({
    userId,
    status: 'reactivated',
    flow: 'validation'
  });

  await Queue.cancel({
    name: 'endSuspension',
    'data.userId': userId
  });

  insertLog(userId, 'CANCELED SUSPENSION');

  if (executed) {
    insertDataChangesLog({
      where: 'users',
      documentID: userId,
      operation: 'update',
      method: 'removeProductSuspension',
      createdBy: this.userId,
      old_data: 'none',
      new_data: category
    });
  }
}

Meteor.methods({
  'users.suspendProducts': async function suspendProductsMethod({ userId, weeks, currentCategory }) {
    Security.checkRole(this.userId, ['super-admin', 'admin', 'validation']);
    const executed = await suspendProducts({ userId, weeks });
    if (executed) {
      insertDataChangesLog({
        where: 'users',
        documentID: userId,
        operation: 'update',
        method: 'suspendProducts',
        createdBy: this.userId,
        old_data: currentCategory,
        new_data: 'none'
      });
    }
  },
  'users.removeProductSuspension': removeProductSuspension
});
