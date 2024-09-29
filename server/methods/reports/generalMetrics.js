import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';
import Reports from '../../collections/reports';
import { check } from 'meteor/check';
import generalMetrics from '../metrics/generalMetrics';

Meteor.methods({
  'reports.generalMetrics.get': function getReportsMethod({ startDate, endDate }) {
    this.unblock();
    Security.checkIfAdmin(this.userId);
    check(startDate, Date);
    check(endDate, Date);
    return Reports.findOne(
      { type: 'generalMetrics', created: { $gt: startDate, $lt: endDate } },
      { sort: { created: -1 } }
    );
  },
  'reports.generalMetrics.create': async function createReportMethod() {
    this.unblock();
    Security.checkRole(this.userId, ['super-admin']);
    const result = await generalMetrics();
    if (result) {
      const reportID = Reports.insert({
        type: 'generalMetrics',
        ready: true,
        created: new Date(),
        report: {
          ...result
        }
      });
    } else {
      throw new Error('Nothing returned');
    }
  }
});
