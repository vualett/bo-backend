import { Meteor } from 'meteor/meteor';
import Invitations from '../collections/invitations';
import Deals from '../collections/deals';
import { EXPORT_METHOD_SECRET } from '../keys';

function exportData(secret) {
  if (EXPORT_METHOD_SECRET !== secret) throw new Meteor.Error('not-authorized');

  const obj = {};

  const invitationsCount = Invitations.find().count();

  obj.invitation = {
    all: invitationsCount
  };

  function transform(doc) {
    const newDoc = doc;
    const deal = Deals.findOne({ userId: doc._id, status: { $ne: 'completed' } });
    const dealsHistory = Deals.find({ userId: doc._id, status: 'completed' }).fetch();

    if (deal) {
      newDoc.cashAdvance = {
        id: deal._id,
        status: deal.status,
        amount: deal.amount,
        fee: deal.amount * deal.fee,
        createdAt: deal.createdAt,
        approvedAt: deal.approvedAt || null,
        modifiedAt: deal.modifiedAt || null,
        payments: deal.payments || null,
        activateAt: deal.activateAt,
        numberOfPayments: deal.numberOfPayments,
        termsOfPayment: deal.termsOfPayment
      };
    }

    if (dealsHistory) {
      newDoc.dealsHistory = dealsHistory;
    }

    return newDoc;
  }

  obj.users = Meteor.users
    .find(
      { type: 'user' },
      {
        transform,
        fields: {
          firstName: 1,
          lastName: 1,
          phone: 1,
          address: 1,
          business: 1,
          createdAt: 1,
          status: 1,
          metrics: 1,
          isPromoter: 1,
          isSubPromoter: 1,
          promoterType: 1,
          invitedBy: 1,
          verifiedDate: 1,
          controlTags: 1
        }
      }
    )
    .fetch();

  return obj;
}

Meteor.methods({
  exportData
});
