import { Meteor } from 'meteor/meteor';
import { subHours, startOfWeek, startOfDay, endOfDay } from 'date-fns';
import Invitations from '../collections/invitations';
import Security from '../utils/security';
import differenceInDays from 'date-fns/differenceInDays';
import { check } from 'meteor/check';
import { parsePhoneNumber } from 'libphonenumber-js';
import { ROLES } from '../consts/roles';

Meteor.publish({
  myInvitations() {
    if (Security.hasRole(this.userId, ['super-admin', 'technical', 'admin'])) return Invitations.find();
    return Invitations.find({ by: this.userId });
  }
});

function transform(id, doc) {
  const newDoc = doc;

  if (doc.used) {
    newDoc.owner = Meteor.users.findOne({ _id: doc.userId }, { fields: { firstName: 1, lastName: 1 } }) || {};
  }
  newDoc.invitedBy = Meteor.users.findOne({ _id: doc.by }, { fields: { firstName: 1, lastName: 1 } }) || {};

  return newDoc;
}

Meteor.publish({
  invitations({ selected, search, queryFilters, invitedBy, sort, limit, skip }) {
    Security.checkRole(this.userId, ['super-admin', 'technical', 'admin', 'support', 'validation']);
    let init = true;
    const self = this;
    let handler = null;
    const query = { $and: [] };

    if (typeof search === 'string') {
      const { number } = parsePhoneNumber(search, 'US');
      query.$and.push({
        'phone.number': number || ''
      });
    } else if (selected) {
      if (selected === 'today') {
        const start = subHours(new Date(), 4);
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        query.$and.push({ when: { $gte: start, $lt: end } });
      } else if (selected === 'thisweek') {
        const start = startOfWeek(new Date());

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        query.$and.push({ when: { $gte: start, $lt: end } });
      } else {
        const start = startOfDay(new Date(selected.startDate));
        const end = endOfDay(new Date(selected.endDate));

        query.$and.push({ when: { $gte: start, $lt: end } });
      }
    }

    if (typeof invitedBy === 'string') {
      const by = Meteor.users.findOne({ firstName: invitedBy }, { fields: { _id: 1 } });
      if (by) {
        query.$and.push({
          by: by._id
        });
      }
    }

    if (queryFilters) {
      queryFilters.forEach((fq) => {
        query.$and.push(fq);
      });
    }

    const _options = {
      ...(limit ? { limit } : { limit: 20 }),
      ...(skip ? { skip } : {}),
      ...(sort ? { sort } : {})
    };

    handler = Invitations.find(query, _options).observeChanges({
      added(id, doc) {
        const transformed = transform(id, doc);
        self.added('invitations', id, transformed);
      },
      changed(id, fields) {
        if (init) return;
        self.changed('invitations', id, fields);
      },
      removed(id) {
        self.removed('invitations', id);
      }
    });

    self.ready();
    init = false;
    self.onStop(() => {
      if (handler) handler.stop();
    });
  },
  pushInvitations({ firstDate, lastDate, show, hide, assigned, mode, language, promoter, limit, sort, skip }) {
    Security.checkRole(this.userId, [ROLES.ONBOARDING, ROLES.SALES, 'admin']);

    check(firstDate, Date);
    check(lastDate, Date);

    if (differenceInDays(lastDate, firstDate) > 1) return this.ready();

    const _show = !!show && show.length && mode !== 'callback' ? show.map((item) => item.value) : null;

    const _naShow = !!_show && show?.find((item) => item.value === 'na');
    const _hide = !!hide && hide.length && mode !== 'callback' ? hide.map((item) => item.value) : null;
    const _language = language?.value != null ? language.value : null;

    const _promoter = !!promoter && promoter.length ? promoter?.map((item) => item.value) : null;

    const _assigned = !!assigned && assigned.length ? assigned.map((item) => item.value) : null;
    const naCase = !!assigned?.find((item) => item.value === 'na');
    const justSupportCase = !Security.hasRole(Meteor.userId(), ['manager', 'admin']);

    let init = true;
    const self = this;
    let handler = null;

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
      ...(_promoter ? { by: { $in: _promoter } } : {}),

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

    const options = {
      ...(skip ? { skip } : {}),
      ...(limit ? { limit } : {}),
      ...(sort ? { sort } : {})
    };

    handler = Invitations.find(query, options).observeChanges({
      added(id, doc) {
        const transformed = transform(id, doc);
        self.added('invitations', id, transformed);
      },
      changed(id, fields) {
        if (init) return;
        self.changed('invitations', id, fields);
      },
      removed(id) {
        self.removed('invitations', id);
      }
    });

    self.ready();
    init = false;
    self.onStop(() => {
      if (handler) handler.stop();
    });
  }
});
