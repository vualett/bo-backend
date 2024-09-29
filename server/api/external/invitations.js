import { Meteor } from 'meteor/meteor';
import cors from 'cors';
import { API } from '../api';
import Invitations from '../../collections/invitations';
import getDateRange from './getDateRange';
import { EXPORT_METHOD_SECRET } from '../../keys';

// GETTING DATA
function data(daterange, agent) {
  const query = {};

  if (daterange) {
    if (typeof daterange === 'object') {
      query.when = {
        $gte: new Date(daterange.startdate),
        $lt: new Date(daterange.enddate)
      };
    } else {
      const { startDate, endDate } = getDateRange(daterange);
      query.when = { $gte: startDate, $lt: endDate };
    }
  }

  const promoters = Meteor.users
    .find(
      { isPromoter: { $exists: true } },
      {
        fields: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          isPromoter: 1,
          isSubPromoter: 1,
          promoterType: 1
        }
      }
    )
    .fetch();

  const invitationsFields = agent === 'invitationspanel' ? {} : { phone: 0 };

  const invitations = Invitations.find(query, {
    fields: invitationsFields
  }).fetch();

  return { invitations, promoters };
}
const corsOptions = {
  allowedHeaders: ['token', 'daterange', 'startdate', 'enddate']
};

// REST API
API.get('/external/invitations', cors(corsOptions), (req, res) => {
  const { token, daterange, startdate, enddate, agent } = req.headers;

  if (EXPORT_METHOD_SECRET !== token) {
    return res.status(401).send(
      JSON.stringify({
        status: 'error',
        error: 'not-authorized'
      })
    );
  }

  const { invitations, promoters } = data(daterange || { startdate, enddate }, agent);

  return res.status(200).send(
    JSON.stringify({
      status: 'success',
      data: {
        invitations,
        promoters
      }
    })
  );
});

// METHOD API
Meteor.methods({
  'exportData.invitations': ({ secret, daterange }) => {
    if (EXPORT_METHOD_SECRET !== secret) throw new Meteor.Error('not-authorized');
    return data(daterange);
  },
  'exportData.invitations.count': ({ secret }) => {
    if (EXPORT_METHOD_SECRET !== secret) throw new Meteor.Error('not-authorized');
    return Invitations.find().count();
  }
});
