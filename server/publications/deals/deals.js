import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Deals from '../../collections/deals';
import Security from '../../utils/security';
import differenceInDays from 'date-fns/differenceInDays';

function isAdmin(userId) {
  const user = Meteor.users.findOne({ _id: userId });
  if (user && user.isAdmin) return true;
  return false;
}

Meteor.publish('singleDealbyUserId', (id) => {
  check(id, String);
  return Deals.find({
    userId: id,
    status: { $in: ['active', 'requested', 'approved', 'suspended', 'closed'] }
  });
});

function dealTransform(id, doc) {
  const newDoc = doc;

  newDoc.owner = Meteor.users.findOne({ _id: doc.userId }) || {};

  return newDoc;
}

Meteor.publish({
  deal(id) {
    return Deals.find({
      _id: id,
      status: { $nin: ['cancelled', 'completed'] }
    });
  },
  dealByUserID(userID) {
    if (!userID) throw new Meteor.Error('Must provide ID');
    return Deals.find({
      userId: userID,
      status: {
        $in: ['active', 'requested', 'approved', 'suspended', 'closed']
      }
    });
  },
  deals(dealId) {
    let init = true;
    const self = this;
    let handler = null;
    const query = {
      status: {
        $in: ['active', 'requested', 'approved', 'suspended']
      }
    };
    Security.checkLoggedIn(this.userId);

    if (dealId) query._id = dealId;

    if (!isAdmin(this.userId)) {
      query.userId = this.userId;
    }

    handler = Deals.find(query, { sort: { createdAt: -1 } }).observeChanges({
      added(id, doc) {
        const transformed = dealTransform(id, doc);
        self.added('deals', id, transformed);
      },
      changed(id, fields) {
        if (init) return;
        self.changed('deals', id, fields);
      },
      removed(id) {
        self.removed('deals', id);
      }
    });

    self.ready();
    init = false;
    self.onStop(() => {
      if (handler) handler.stop();
    });
  }
});

Meteor.publish('repetition', function repetition({ firstDate, lastDate, show, hide, assigned, mode, limit, sort, skip }) {
  Security.checkRole(this.userId, ['repetition', 'admin']);

  check(firstDate, Date);
  check(lastDate, Date);

  if (differenceInDays(lastDate, firstDate) > 1) return this.ready();

  const _show = !!show && show.length && mode !== 'callback' ? show.map((item) => item.value) : null;
  const _hide = !!hide && hide.length && mode !== 'callback' ? hide.map((item) => item.value) : null;
  const _assigned = !!assigned && assigned.length ? assigned.map((item) => item.value) : null;
  const naCase = !!assigned?.find((item) => item.value === 'na');
  const justSupportCase = !Security.hasRole(Meteor.userId(), ['manager', 'admin']);

  const self = this;
  let handler = null;
  let init = true;

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

  const options = {
    ...(skip ? { skip } : {}),
    ...(sort ? { sort } : {}),
    ...(limit ? { limit } : { limit: 20 }),
    fields: {
      _id: 1,
      userId: 1,
      amount: 1,
      completeAt: 1,
      assignedAgent: 1,
      interaction: 1
    }
  };

  function _transform(id, doc) {
    const newDoc = doc;
    const owner =
      Meteor.users.findOne(
        { _id: doc.userId },
        {
          fields: {
            firstName: 1,
            lastName: 1,
            language: 1,
            devices: 1,
            lastCall: 1,
            assignedAgent: 1,
            suspendedTill: 1
          }
        }
      ) || {};
    newDoc.owner = owner;

    const _case = owner?.language
      ? 'userlang'
      : owner.devices && owner.devices[0].locales && owner.devices[0].locales[0].languageCode === 'es'
        ? 'devicees'
        : 'deviceen';

    switch (_case) {
      case 'userlang':
        newDoc.language = owner?.language;
        break;
      case 'devicees':
        newDoc.language = 'es';
        break;
      case 'deviceen':
        newDoc.language = 'en';
        break;
    }
    return newDoc;
  }

  handler = Deals.find(query, options).observeChanges({
    added(id, doc) {
      const transformed = _transform(id, doc);
      self.added('deals', id, transformed);
    },
    changed(id, fields) {
      if (init) return;
      self.changed('deals', id, fields);
    },
    removed(id) {
      self.removed('deals', id);
    }
  });

  self.ready();
  init = false;
  self.onStop(() => {
    if (handler) handler.stop();
  });
});
