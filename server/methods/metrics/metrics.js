import { Meteor } from 'meteor/meteor';
import { dealsMetrics } from './deals';
import usersMetrics from './users';
import daily from './daily';
import invitationsCount from './invitations';
import paymentsBehavior from './paymentsbehavior';
import Security from '../../utils/security';

Meteor.methods({
  'metrics.deals': function dealsMetricsMethod(params) {
    Security.checkIfAdmin(this.userId);
    this.unblock();
    return dealsMetrics(params);
  },
  'metrics.users': function usersMetricsMethod(params) {
    Security.checkIfAdmin(this.userId);
    this.unblock();
    return usersMetrics(params);
  },
  'metrics.daily': function dailyMethod(params) {
    Security.checkIfAdmin(this.userId);
    this.unblock();
    return daily(params);
  },
  'metrics.invitations': function invitationsCountMethod(params) {
    Security.checkIfAdmin(this.userId);
    return invitationsCount(params);
  },
  'metrics.paymentsbehavior': function paymentsbehaviorMethod(params) {
    Security.checkIfAdmin(this.userId);
    this.unblock();
    return paymentsBehavior(params);
  }
});
