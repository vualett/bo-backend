import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';
import { Settings } from '../../collections/settings';
import { check } from 'meteor/check';

Meteor.methods({
  'settings.monthlyFinancialCommitment.get': function getSettingMethod() {
    Security.checkIfAdmin(this.userId);
    return Settings.findOne({ _id: 'monthlyFinancialCommitment' });
  },
  'settings.monthlyFinancialCommitment.update': async function createReportMethod({ value }) {
    check(value, Number);
    Security.checkRole(this.userId, ['super-admin', 'admin']);
    const result = await Settings.update({ _id: 'monthlyFinancialCommitment' }, { value }, { upsert: true });
    return result;
  }
});
