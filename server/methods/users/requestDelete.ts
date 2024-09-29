import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { queueDeleteCustomerAccount } from '../../queue/queue';
import insertLog from '../logs/insertGenericLog';
import Deals from '../../collections/deals';
import Security from '../../utils/security';
import createIssue from '../../utils/jira/createIssue';
// DEFINING METHOD

const method = {
  type: 'method',
  name: 'users.requestDelete',
  clientAddress: () => true
};

DDPRateLimiter.addRule(method, 1, 10000);

Meteor.methods({
  [method.name]: async function requestDelete(reason: string): Promise<boolean> | never {
    const userId = Meteor.userId();
    const user = Meteor.users.findOne({ _id: userId });
    const userName = `${user?.firstName} ${user?.lastName}`;

    Security.checkLoggedIn(userId);

    if (userId === null) throw new Meteor.Error('not-authorized');

    const deal = await Deals.findOneAsync({ userId, status: { $nin: ['completed', 'cancelled'] } });

    if (deal !== undefined) {
      throw new Meteor.Error('You have an active deal. Please cancel it before deleting your account.');
    }

    await Meteor.users.updateAsync(
      { _id: userId },
      {
        $set: {
          deleteRequest: new Date(),
          disabled: true,
          'services.resume.loginTokens': []
        }
      }
    );

    void queueDeleteCustomerAccount(userId);

    await createIssue({
      title: `Delete account ${userName}`,
      description: `User ${userName} requested to delete his account. \nReason: ${reason}`,
      userId
    });

    insertLog(userId, 'App::Account Deletion Requested');

    return true;
  }
});
