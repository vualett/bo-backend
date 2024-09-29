import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';
import Invitations from '../../collections/invitations';
import { parsePhoneNumber } from 'libphonenumber-js';
async function findInvitation({ searchPhone }) {
  if (!searchPhone) throw new Meteor.Error('EMPTY PARAMS');

  Security.checkLoggedIn(this.userId);
  const { number } = parsePhoneNumber(searchPhone, 'US');
  const result = await Invitations.find(
    {
      ...(searchPhone ? { 'phone.number': number } : {})
    },
    { sort: { when: -1 } }
  ).fetch();

  return result;
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'invitations.searchByNamePhone'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: findInvitation
});
