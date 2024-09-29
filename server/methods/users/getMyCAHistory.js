import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import Security from '../../utils/security';

function getMyCAHistory() {
  Security.checkLoggedIn(this.userId);
  const cashadvances = Deals.find({
    userId: this.userId,
    status: 'completed'
  }).fetch();
  return cashadvances;
}

Meteor.methods({ 'users.getMyCAHistory': getMyCAHistory });
