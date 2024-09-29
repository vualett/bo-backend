/* eslint-disable dot-notation */
import { Meteor } from 'meteor/meteor';
import addHours from 'date-fns/addHours';
import { Counter } from 'meteor/natestrauser:publish-performant-counts';
import Deals from '../../collections/deals';
import Invitations from '../../collections/invitations';
import Security from '../../utils/security';
import profileCase from '../../utils/profileCase';
import differenceInDays from 'date-fns/differenceInDays';
import { check } from 'meteor/check';
import { endOfDay, startOfDay } from 'date-fns';
import { ROLES } from '../../consts/roles';

Meteor.publish({
  countUsers({ query }) {
    const _query = { $and: [{ type: 'user' }, { deletedAt: { $exists: false } }] };

    const _case = profileCase(Meteor.userId());

    if (typeof query === 'string') {
      _query.$and.push({
        $or: [
          { firstName: query || '' },
          { lastName: query || '' },
          { 'phone.number': query || '' },
          {
            emails: {
              $elemMatch: { address: query || '' }
            }
          }
        ]
      });
    } else {
      _query.$and.push(query);
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

    return new Counter('countUsers', Meteor.users.find(_query));
  },
  countTodayDeals() {
    const totalQuery = {
      status: { $in: ['requested', 'active', 'approved'] },
      createdAt: { $gte: addHours(startOfDay(new Date()), 4) }
    };

    return new Counter('countTodayDeals', Deals.find(totalQuery));
  },
  countTodayNewDeals() {
    const newDealsQuery = {
      createdAt: { $gte: addHours(startOfDay(new Date()), 4) },
      status: { $in: ['requested', 'active', 'approved'] },
      firstDeal: true
    };
    return new Counter('countTodayNewDeals', Deals.find(newDealsQuery));
  },
  countTodayExistingDeals() {
    const exisitngDealsQuery = {
      createdAt: { $gte: addHours(startOfDay(new Date()), 4) },
      status: { $in: ['requested', 'active', 'approved'] },
      firstDeal: { $exists: false }
    };
    return new Counter('countTodayExistingDeals', Deals.find(exisitngDealsQuery));
  },
  countDeals(props) {
    const _query = {};

    const _case = Security.hasExplicitRole(this.userId, 'repetition')
      ? Security.hasExplicitRole(this.userId, 'manager')
        ? 'repetitionLead'
        : 'repetition'
      : Security.hasExplicitRole(this.userId, ROLES.ONBOARDING) && Security.hasExplicitRole(this.userId, ROLES.SALES)
        ? Security.hasExplicitRole(this.userId, 'manager')
          ? null
          : Security.hasExplicitRole(this.userId, ROLES.ONBOARDING)
            ? Security.hasExplicitRole(this.userId, 'manager')
              ? 'onboardingLead'
              : ROLES.ONBOARDING
            : Security.hasExplicitRole(this.userId, ROLES.SALES)
              ? Security.hasExplicitRole(this.userId, 'manager')
                ? 'salesLead'
                : ROLES.SALES
              : null
        : null;

    if (_case === 'repetition') {
      _query['assignedAgent'] = {
        $elemMatch: {
          category: 'repetition',
          'agent.id': this.userId
        }
      };
      _query['firstDeal'] = { $exists: false };
    } else if (_case === 'repetitionLead') {
      _query['assignedAgent'] = {
        $elemMatch: {
          category: 'repetition'
        }
      };
      _query['firstDeal'] = { $exists: false };
    } else if (_case === ROLES.ONBOARDING) {
      _query['assignedAgent'] = {
        $elemMatch: {
          category: ROLES.ONBOARDING,
          'agent.id': this.userId
        }
      };
      _query['firstDeal'] = { $exists: true };
    } else if (_case === 'onboardingLead') {
      _query['assignedAgent'] = {
        $elemMatch: {
          category: ROLES.ONBOARDING
        }
      };
      _query['firstDeal'] = { $exists: true };
    } else if (_case === ROLES.SALES) {
      _query['assignedAgent'] = {
        $elemMatch: {
          category: ROLES.SALES,
          'agent.id': this.userId
        }
      };
      _query['firstDeal'] = { $exists: true };
    } else if (_case === 'salesLead') {
      _query['assignedAgent'] = {
        $elemMatch: {
          category: ROLES.SALES
        }
      };
      _query['firstDeal'] = { $exists: true };
    }

    if (props && props.query) {
      if (props.query.status) _query.status = props.query.status;
      if (props.query.createdAt) _query.createdAt = props.query.createdAt;
    } else {
      _query.status = {
        $not: {
          $in: ['suspended', 'cancelled']
        }
      };
    }

    return new Counter('countDeals', Deals.find(_query));
  },
  countRepetitionDeals({ firstDate, lastDate, show, hide, assigned, mode }) {
    const _show = !!show && show.length && mode !== 'callback' ? show.map((item) => item.value) : null;
    const _hide = !!hide && hide.length && mode !== 'callback' ? hide.map((item) => item.value) : null;
    const _assigned = !!assigned && assigned.length ? assigned.map((item) => item.value) : null;
    const naCase = !!assigned?.find((item) => item.value === 'na');
    const justSupportCase = !Security.hasRole(Meteor.userId(), ['manager', 'admin']);

    const query = {
      ...(mode !== 'callback'
        ? {
          completeAt: {
            $gte: firstDate,
            $lt: lastDate
          }
        }
        : {
          'interaction.status': 'callback',
          'interaction.callbackDate': {
            $gte: firstDate,
            $lt: lastDate
          }
        }),
      ...(naCase
        ? {
          $or: [
            {
              assignedAgent: {
                $elemMatch: {
                  category: 'repetition',
                  ...(_assigned ? { 'agent.id': { $in: _assigned } } : {})
                }
              }
            },
            { assignedAgent: { $exists: false } }
          ]
        }
        : justSupportCase
          ? {
            assignedAgent: {
              $elemMatch: {
                category: 'repetition',
                'agent.id': this.userId
              }
            }
          }
          : _assigned
            ? {
              assignedAgent: {
                $elemMatch: {
                  category: 'repetition',
                  'agent.id': { $in: _assigned }
                }
              }
            }
            : {}),
      ...(_show ? { 'interaction.status': { $in: _show } } : {}),
      ...(_hide ? { 'interaction.status': { $nin: _hide } } : {})
    };

    return new Counter('countRepetitionDeals', Deals.find(query));
  },
  countPushInvitations({ firstDate, lastDate, show, hide, assigned, mode, language, promoter }) {
    check(firstDate, Date);
    check(lastDate, Date);

    if (differenceInDays(lastDate, firstDate) > 1) return this.ready();

    const _show = !!show && show.length && mode !== 'callback' ? show.map((item) => item.value) : null;
    const _promoter = !!promoter && promoter.length ? promoter?.find((item) => item.value).value : null;
    const _naShow = !!_show && show?.find((item) => item.value === 'na');
    const _hide = !!hide && hide.length && mode !== 'callback' ? hide.map((item) => item.value) : null;
    const _assigned = !!assigned && assigned.length ? assigned.map((item) => item.value) : null;
    const _language = language?.value != null ? language.value : null;
    const naCase = !!assigned?.find((item) => item.value === 'na');
    const justSupportCase = !Security.hasRole(Meteor.userId(), ['manager', 'admin']);

    const query = {
      ...(mode !== 'callback'
        ? {
          when: {
            $gte: firstDate,
            $lt: lastDate
          }
        }
        : {
          'interaction.callbackDate': {
            $gte: firstDate,
            $lt: lastDate
          },
          'interaction.status': 'callback'
        }),
      ...(_promoter ? { by: _promoter } : {}),
      ...(_show
        ? _naShow
          ? {
            $or: [{ 'interaction.status': { $in: _show } }, { 'interaction.status': { $exists: false } }]
          }
          : { 'interaction.status': { $in: _show } }
        : {}),
      ...(_hide ? { 'interaction.status': { $nin: _hide } } : {}),
      ...(justSupportCase
        ? { 'assignedAgent.agent.id': this.userId }
        : _assigned
          ? !naCase
            ? { 'assignedAgent.agent.id': { $in: _assigned } }
            : {
              $or: [{ 'assignedAgent.agent.id': { $in: _assigned } }, { assignedAgent: { $exists: false } }]
            }
          : {}),
      ...(_language ? { 'metadata.language': _language } : {})
    };

    return new Counter('countPushInvitations', Invitations.find(query));
  },
  countInvitations({ queryFilters, dateFilter }) {
    const _query = { $and: [] };

    if (dateFilter) {
      _query.$and.push({
        when: {
          $gte: startOfDay(new Date(dateFilter.startDate)),
          $lt: endOfDay(new Date(dateFilter.endDate))
        }
      });
    }

    if (queryFilters) {
      queryFilters.forEach((fq) => {
        _query.$and.push(fq);
      });
    }

    return new Counter('countInvitations', Invitations.find(_query));
  }
});
