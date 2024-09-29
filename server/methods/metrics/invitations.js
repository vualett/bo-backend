import moment from 'moment';

import Invitations from '../../collections/invitations';

export default function invitationsCount() {
  const start = moment().subtract(3, 'days').startOf('day').toDate();
  const end = moment().endOf('day').toDate();

  return Invitations.find({
    $and: [
      { used: { $eq: false } },
      { notInterested: { $not: { $eq: true } } },
      { when: { $gte: new Date(start), $lt: new Date(end) } }
    ]
  }).count();
}
