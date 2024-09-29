import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../../utils/security';
import updateInteraction from '../updateInteraction';
import { STAGE, STATUS, SUB_STATUS } from '../../../consts/user';
import changeStatus from '../changeStatus';
import changeSubStatus from '../changeSubStatus';

async function evaluateUpgradeRequest({ userId, evaluationResult }) {
  check(userId, String);
  check(evaluationResult, Boolean);
  Security.checkRole(Meteor.userId(), ['super-admin', 'admin', 'validation']);

  const query = { _id: userId };
  const user = Meteor.users.findOne(query);

  if (user && ['micro', 'c', 'b', 'a', 'a+', '2kw14', '2k', 'xl', 'none'].includes(user.category)) {
    let newCategory = {};
    if (Security.hasAccess(Meteor.userId(), ['upgradeTo3000'])) {
      newCategory = {
        none: 'c',
        micro: 'c',
        c: 'b',
        b: 'a',
        a: 'a+',
        'a+': '2k',
        '2k': 'xl'
      };
    } else if (Security.hasAccess(Meteor.userId(), ['upgradeTo2000'])) {
      newCategory = {
        none: 'c',
        micro: 'c',
        c: 'b',
        b: 'a',
        a: 'a+',
        'a+': '2k',
        '2k': '2k+',
        '2kw14': '2k+'
      };
    } else {
      newCategory = {
        none: 'c',
        micro: 'c',
        c: 'b',
        b: 'a',
        a: 'a+'
      };
    }

    Meteor.users.update(query, {
      $unset: { 'status.upgradeRequested': '' },
      ...(evaluationResult
        ? {
          $set: {
            category: newCategory[user.category]
          }
        }
        : {})
    });

    if (evaluationResult) {
      updateInteraction({
        userId,
        status: 'escalated',
        flow: 'validation'
      });
    } else {
      updateInteraction({
        userId,
        status: 'not escalated',
        flow: 'validation'
      });
    }

    Meteor.call('timelogs.insert', {
      userId,
      event: evaluationResult ? 'upgrade approved' : 'upgrade declined',
      type: 'account',
      eventType: 'user',
      metadata: {
        ...(evaluationResult ? { from: user.category, to: newCategory[user.category] } : {})
      },
      _by:
        Meteor.user() !== undefined
          ? { id: Meteor.user()._id, name: `${Meteor.user().firstName} ${Meteor.user().lastName}` }
          : { id: 'system', name: 'system' }
    });

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

  }
}

Meteor.methods({ 'users.evaluateUpgradeRequest': evaluateUpgradeRequest });
