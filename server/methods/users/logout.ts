import { Meteor } from 'meteor/meteor';

import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import Security from '../../utils/security';

async function logout(): Promise<boolean> {
  try {
    Security.checkLoggedIn(Meteor.userId());

    const userId = Meteor.userId();
    if (!userId) {
      return false;
    }
    await Meteor.users.updateAsync(
      { _id: userId },
      { $set: { 'status.online': false, 'services.resume.loginTokens': [] } }
    );
  } catch (error) {}

  return true;
}
const method = {
  type: 'method',
  name: 'users.logout',
  func: logout
};
DDPRateLimiter.addRule(method, 1, 500);
Meteor.methods({ [method.name]: method.func });
