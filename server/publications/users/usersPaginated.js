import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import Security from '../../utils/security';
import profileCase from '../../utils/profileCase';
import { ROLES } from '../../consts/roles';

const fields = {
  _id: 1,
  phone: 1,
  firstName: 1,
  lastName: 1,
  status: 1,
  emails: 1,
  hasDriverLicense: 1,
  hasFunding: 1,
  isAdmin: 1,
  address: 1,
  currentCashAdvance: 1,
  createdAt: 1,
  rating: 1,
  bankAccount: 1,
  plaidAssetReport: 1,
  verifiedDate: 1,
  oncall: 1,
  lastCall: 1,
  category: 1,
  automaticApproved: 1,
  business: 1,
  controlTags: 1,
  interaction: 1,
  assignedAgent: 1,
  promoCode: 1,
  offStage: 1
};

function usersPaginated({ query, sort, skip, limit }) {
  check(query, Match.OneOf(Object, String));
  Security.checkIfAdmin(this.userId);

  const _case = profileCase(Meteor.userId());

  const _query = { $and: [{ type: 'user' }, { deletedAt: { $exists: false } }] };

  _query.$and.push(query);

  if (Security.hasAccess(this.userId, ['onlyICD'])) {
    _query.$and.push({ 'business.industry': 'Independent Contractor Driver' });
  }

  if (Security.hasAccess(this.userId, ['onlyIC'])) {
    _query.$and.push({ 'business.industry': 'Independent Contractor' });
  }

  switch (_case) {
    case 'repetition':
      _query.$and.push(
        ...[
          {
            assignedAgent: {
              $elemMatch: {
                category: 'repetition',
                'agent.id': Meteor.userId()
              }
            }
          },
          {
            'metrics.cashAdvances.count': {
              $gte: 1
            }
          }
        ]
      );
      break;
    case 'repetitionManager':
      _query.$and.push(
        ...[
          {
            assignedAgent: {
              $elemMatch: {
                category: 'repetition'
              }
            }
          },
          {
            'metrics.cashAdvances.count': {
              $gte: 1
            }
          }
        ]
      );

      break;
    case ROLES.ONBOARDING:
    case ROLES.SALES:
      _query.$and.push(
        ...[
          {
            assignedAgent: {
              $elemMatch: {
                category: { $in: [ROLES.ONBOARDING, ROLES.SALES] },
                'agent.id': Meteor.userId()
              }
            }
          },
          {
            'metrics.cashAdvances.count': {
              $lt: 1
            }
          }
        ]
      );

      break;
    case 'onboardingManager':
    case 'salesManager':
      _query.$and.push(
        ...[
          {
            'metrics.cashAdvances.count': {
              $lt: 1
            }
          }
        ]
      );

      break;
    case 'validate':
    case 'escalate':
    case 'reactivate':
      _query.$and.push({
        $or: [
          {
            assignedAgent: {
              $elemMatch: {
                category: 'validation',
                'agent.id': Meteor.userId()
              }
            }
          },
          {
            assignedAgent: {
              $exists: false
            }
          }
        ]
      });

      break;
    default:
      break;
  }

  const options = {
    ...(skip ? { skip } : {}),
    ...(sort ? { sort } : {}),
    ...(limit ? { limit } : { limit: 20 }),
    fields
  };

  return Meteor.users.find(_query, options);
}

Meteor.publish({ usersPaginated });
