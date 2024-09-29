import Deals from '../../collections/deals';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';

async function approveMCA(_id) {
  check(_id, String);
  Security.checkIfAdmin(this.userId);
  const update = await Deals.update(
    { _id },
    {
      $set: {
        'mca.status': 'approved'
      }
    }
  );

  if (update) {
    return true;
  } else {
    throw new Meteor.Error('DOCUMENT NOT UPDATED');
  }
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.mca.approve'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: approveMCA
});
