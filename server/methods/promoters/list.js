import { Meteor } from 'meteor/meteor';
import { EXPORT_METHOD_SECRET } from '../../keys';

function promotersList(secret) {
  if (EXPORT_METHOD_SECRET !== secret) throw new Meteor.Error('not-authorized');
  const promoters = Meteor.users.find({ isPromoter: { $exists: true } }).fetch();
  return promoters;
}

Meteor.methods({ promotersList });
