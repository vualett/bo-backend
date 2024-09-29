import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';
import { check } from 'meteor/check';
import Reports from '../../collections/reports';

interface IReport {
  type: string;
}

Meteor.methods({
  'reports.getLast': function getReportsMethod({ type }: IReport) {
    check(type, String);
    this.unblock();
    Security.checkLoggedIn(this.userId);
    const report = Reports.findOne({ type }, { sort: { created: -1 } });
    return report;
  }
});
