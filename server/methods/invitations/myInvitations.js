import { Meteor } from 'meteor/meteor';
import MongoPaging from 'mongo-cursor-pagination';
import { startOfDay, endOfDay, addDays, startOfWeek, subWeeks, subHours } from 'date-fns';
import Invitations from '../../collections/invitations';
import Security from '../../utils/security';
import { parsePhoneNumber } from 'libphonenumber-js';
Meteor.methods({
  myInvitations() {
    Security.checkLoggedIn(Meteor.userId());
    const startDate = subWeeks(startOfWeek(startOfDay(new Date())), 1);
    const endDate = startOfDay(addDays(new Date(), 1));

    return Invitations.find({
      when: { $gte: startDate, $lt: endDate },
      by: Meteor.userId()
    }).fetch();
  },
  async invitations({ startDate, endDate, next, previous, promoterID, queryFilters, invitedBy, sort, limit, skip }) {
    Security.checkLoggedIn(Meteor.userId());
    this.unblock();

    const query = { $and: [] };

    query.$and.push({
      when: { $gte: startOfDay(startDate), $lt: addDays(startOfDay(endDate), 1) }
    });

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

    if (promoterID) query.by = promoterID;

    const results = await MongoPaging.find(Invitations.rawCollection(), {
      previous,
      query,
      next,
      ...(limit ? { limit } : { limit: 250 }),
      ...(sort ? { sort } : {}),
      ...(skip ? { skip } : {})
    });

    return results;
  },
  getCountsPerPromoters({ search, selected, invitedBy, queryFilters }) {
    Security.checkLoggedIn(Meteor.userId());
    this.unblock();

    const query = { $and: [] };

    if (typeof search === 'string') {
      const { number } = parsePhoneNumber(search, 'US');
      query.$and.push({
        'phone.number': number
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

    const invitations = Invitations.find(query).fetch();

    return invitations.map((i) => {
      return {
        ...i,
        invitedBy: Meteor.users.findOne({ _id: i.by }, { fields: { _id: 1, firstName: 1, lastName: 1 } })
      };
    });
  },
  getProspectsLengthByPromoterId(startDate, endDate, promoterId) {
    return Invitations.find({
      by: promoterId,
      when: { $gte: startDate, $lt: endDate }
    }).count();
  }
});
