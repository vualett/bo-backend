import { Meteor } from 'meteor/meteor';
import Metrics from '../../collections/metrics';
import profileCase from '../../utils/profileCase';
import { ROLES } from '../../consts/roles';
import { STAGE, STATUS } from '../../consts/user';

export default async function usersMetrics(options) {
  if (options && options.all) {
    const metrics = Metrics.findOne({ _id: 'usersMetrics' });

    const { allCount, incompleteCount, revisionCount, validationCount, withoutcashadvanceCount } = metrics;

    return {
      count: {
        all: allCount,
        incomplete: incompleteCount,
        waitingVerification: validationCount + revisionCount,
        validationNew: validationCount,
        validationRevision: revisionCount,
        voicemail: 0,
        callback: 0,
        undecided: 0,
        declined: 0,
        unqualified: 0,
        withoutcashadvance: withoutcashadvanceCount
      }
    };
  }

  let unqualified = 0;

  const _case = profileCase(Meteor.userId());

  let portfolioQuery = { deletedAt: { $exists: false } };

  switch (_case) {
    case 'repetitionManager':
      portfolioQuery = {
        ...portfolioQuery,
        'metrics.cashAdvances.count': {
          $gte: 1
        }
      };
      break;
    case 'repetition':
      portfolioQuery = {
        ...portfolioQuery,
        assignedAgent: {
          $elemMatch: {
            category: 'repetition',
            'agent.id': Meteor.userId()
          }
        }
      };
      break;
    case 'onboardingManager':
    case 'salesManager':
      portfolioQuery = {
        ...portfolioQuery,
        'metrics.cashAdvances.count': {
          $lt: 1
        }
      };
      break;
    case ROLES.ONBOARDING:
    case ROLES.SALES:
      portfolioQuery = {
        ...portfolioQuery,
        assignedAgent: {
          $elemMatch: {
            category: { $in: [ROLES.ONBOARDING, ROLES.SALES] },
            'agent.id': Meteor.userId()
          }
        }
      };
      break;
    case 'validate':
    case 'escalate':
    case 'reactivate':
      portfolioQuery = {
        ...portfolioQuery,
        assignedAgent: {
          $elemMatch: {
            category: 'validation',
            'agent.id': Meteor.userId()
          }
        }
      };
      break;

    default:
      break;
  }

  if (options && options.unqualified) {
    unqualified = (() => {
      const _query = { type: 'user', 'status.qualify': { $eq: false }, deletedAt: { $exists: false } };

      return Meteor.users.find(_query).count();
    })();
  }

  // WITHOUTCASHADVANCE AGGREGATE
  const withoutCashadvance = await (async () => {
    const _pipeline = [
      {
        $match: {
          ...portfolioQuery,
          $or: [
            {
              $and: [
                { 'status.verified': { $eq: true } },
                { 'status.qualify': { $eq: true } },
                { currentCashAdvance: { $eq: false } },
                { 'metrics.cashAdvances.count': { $in: [0, null] } },
                { category: { $nin: ['none', 'suspended', '!none'] } },
              ],
            },
            { 'offStage.status': { $eq: STATUS.NEED_MORE_INFO } },
          ]
        },
      },
      {
        $count: 'count'
      }
    ];

    return Meteor.users.rawCollection().aggregate(_pipeline).toArray();
  })();

  // WAITINGVERIFICATION AGGREGATE
  const waitingVerification = await (async () => {
    const _pipeline = [
      {
        $match: {
          ...portfolioQuery,
          $or: [
            {
              $and: [
                { type: 'user' },
                { 'status.verified': { $eq: false } },
                { 'status.qualify': { $eq: true } },
                { automaticFlowVerify: { $eq: false } },
                { 'status.notInterested': { $eq: false } },
                { 'emails.verified': { $eq: true } },
                { hasFunding: { $eq: true } },
                { hasDriverLicense: { $eq: true } },
                { 'offStage.status': { $ne: STATUS.NEED_MORE_INFO } },
              ]
            }
          ]
        }
      },
      {
        $project: {
          lastEmail: { $slice: ['$emails', -1] }
        }
      },
      {
        $match: {
          'lastEmail.verified': { $eq: true }
        }
      },
      {
        $count: 'count'
      }
    ];

    return Meteor.users.rawCollection().aggregate(_pipeline).toArray();
  })();

  // ValidationNew AGGREGATE
  const validationNew = await (async () => {
    const _pipeline = [
      {
        $match: {
          ...portfolioQuery,
          $or: [
            {
              $and: [
                { type: 'user' },
                { 'status.verified': { $eq: false } },
                { 'status.notInterested': { $eq: false } },
                { automaticFlowVerify: { $eq: false } },
                { 'status.qualify': { $eq: true } },
                { 'emails.verified': { $eq: true } },
                { hasFunding: { $eq: true } },
                { hasDriverLicense: { $eq: true } },
                { 'offStage.status': { $ne: STATUS.NEED_MORE_INFO } },
              ]
            }
          ]
        }
      },
      {
        $count: 'count'
      }
    ];

    return Meteor.users.rawCollection().aggregate(_pipeline).toArray();
  })();

  // validationRevision AGGREGATE
  const validationRevision = await (async () => {
    const _pipeline = [
      {
        $match: {
          ...portfolioQuery,

          $or: [
            {
              'status.upgradeRequested': { $eq: true }
            },
            {
              'status.reactivationRequested': { $eq: true }
            }
          ]
        }
      },
      {
        $project: {
          lastEmail: { $slice: ['$emails', -1] }
        }
      },
      {
        $match: {
          'lastEmail.verified': { $eq: true }
        }
      },
      {
        $count: 'count'
      }
    ];

    return Meteor.users.rawCollection().aggregate(_pipeline).toArray();
  })();

  // INCOMPLETE AGGREGATE
  const incomplete = await (async () => {
    if (_case === 'repetition' || _case === 'repetitionManager') {
      return Meteor.users
        .find({
          type: 'user',
          'interaction.status': 'incomplete',
          ...portfolioQuery
        })
        .count();
    } else {
      const _pipeline = [
        {
          $match: {
            type: 'user',
            'status.qualify': { $eq: true },
            'status.notInterested': { $eq: false },
            'offStage.status': { $nin: [STATUS.IDV_PENDING_REVIEW, STATUS.IDV_FAILED] },
            ...(_case === 'onboardingManager' || _case === 'admin'
              ? {
                'status.verified': { $eq: false },
                $or: [
                  {
                    assignedAgent: {
                      $elemMatch: {
                        category: ROLES.ONBOARDING
                      }
                    }
                  },
                  {
                    assignedAgent: {
                      $exists: false
                    }
                  }
                ]
              }
              : {
                'status.verified': {
                  $eq: ['repetition', 'repetitionManager'].includes(_case)
                }
              }),

            ...portfolioQuery
          }
        },
        {
          $project: {
            hasFunding: 1,
            hasDriverLicense: 1,
            lastEmail: { $slice: ['$emails', -1] }
          }
        },
        {
          $match: {
            $or: [
              { hasFunding: { $eq: false } },
              { hasDriverLicense: { $eq: false } },
              { 'lastEmail.verified': { $eq: false } }
            ]
          }
        },
        {
          $count: 'count'
        }
      ];

      return Meteor.users.rawCollection().aggregate(_pipeline).toArray();
    }
  })();

  const voicemail = await (async () => {
    return Meteor.users
      .find({
        type: 'user',
        'interaction.status': 'voicemail',
        ...portfolioQuery
      })
      .count();
  })();

  const callback = await (async () => {
    return Meteor.users
      .find({
        type: 'user',
        'interaction.status': 'callback',
        ...portfolioQuery
      })
      .count();
  })();

  const undecided = await (async () => {
    return Meteor.users
      .find({
        type: 'user',
        'interaction.status': 'undecided',
        ...portfolioQuery
      })
      .count();
  })();

  const declined = await (async () => {
    return Meteor.users
      .find({
        type: 'user',
        'interaction.status': 'declined',
        ...portfolioQuery
      })
      .count();
  })();

  const idvPendingReview = await (async () => {
    return Meteor.users
      .find({
        type: 'user',
        'offStage.stage': STAGE.ONBOARDING.STAGE_1,
        'offStage.status': STATUS.IDV_PENDING_REVIEW,
        ...portfolioQuery
      })
      .count();
  })();

  const idvFailed = await (async () => {
    return Meteor.users
      .find({
        type: 'user',
        'offStage.stage': STAGE.ONBOARDING.STAGE_1,
        'offStage.status': STATUS.IDV_FAILED,
        ...portfolioQuery
      })
      .count();
  })();

  return {
    count: {
      all: 0,
      incomplete:
        _case === 'repetition' || _case === 'repetitionManager' ? incomplete : incomplete[0] ? incomplete[0].count : 0,
      waitingVerification: waitingVerification[0] ? waitingVerification[0].count : 0,
      validationNew: validationNew[0] ? validationNew[0].count : 0,
      validationRevision: validationRevision[0] ? validationRevision[0].count : 0,
      withoutcashadvance: withoutCashadvance[0] ? withoutCashadvance[0].count : 0,
      voicemail,
      callback,
      undecided,
      declined,
      unqualified,
      idvPendingReview,
      idvFailed,
      idvErrors: idvPendingReview + idvFailed
    }
  };
}
