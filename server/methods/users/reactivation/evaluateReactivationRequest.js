import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import insertLog from '../../logs/insertGenericLog';
import addWeeks from 'date-fns/addWeeks';
import startOfDay from 'date-fns/startOfDay';
import Security from '../../../utils/security';
import updateInteraction from '../updateInteraction';
import Queue from '../../../queue/queue';
import { STAGE, STATUS, SUB_STATUS } from '../../../consts/user';
import changeStatus from '../changeStatus';
import changeSubStatus from '../changeSubStatus';

async function evaluateReactivationRequest({ userId, category, declined, hold }) {
  check(userId, String);
  check(category, String);
  Security.checkRole(Meteor.userId(), ['super-admin', 'admin', 'validation']);

  const query = { _id: userId };

  if (!declined) {
    updateInteraction({
      userId,
      status: 'reactivated',
      flow: 'validation'
    });

    Queue.cancel({
      name: 'reevaluateClient',
      'data.userId': userId
    });

    Meteor.users.update(query, {
      $unset: { 'status.reactivationRequested': '', reactivationHold: '' },
      $set: {
        category
      }
    });

    const user = Meteor.users.findOne(query);
    if (user?.offStage?.stage === STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10) {
      await changeStatus({
        userId,
        status: STATUS.WAITING_FOR_CLIENT_REQUEST,
        agentId: Meteor.userId()
      });

      await changeSubStatus({
        userId,
        subStatus: SUB_STATUS.ACTION_NEEDED,
        agentId: Meteor.userId()
      });
    }
  } else {
    insertLog(userId, `REACTIVATION DECLINED, ${hold} WEEKS TO REAPPLY`);
    updateInteraction({
      userId,
      status: 'not reactivated',
      flow: 'validation'
    });
    Meteor.users.update(query, {
      $unset: { 'status.reactivationRequested': '' },
      $set: {
        reactivationHold: addWeeks(startOfDay(new Date()), hold)
      }
    });
  }

  Meteor.call('timelogs.insert', {
    userId,
    event: !declined ? 'reactivation approved' : 'reactivation declined',
    type: 'account',
    eventType: 'user',
    metadata: {
      ...(!declined ? { category } : { hold: `${hold} weeks to reapply` })
    },
    _by:
      Meteor.user() !== undefined
        ? { id: Meteor.user()._id, name: `${Meteor.user().firstName} ${Meteor.user().lastName}` }
        : { id: 'system', name: 'system' }
  });
}

Meteor.methods({
  'users.evaluateReactivationRequest': evaluateReactivationRequest
});
