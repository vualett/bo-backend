import { Meteor } from 'meteor/meteor';
import endOfDay from 'date-fns/endOfDay';
import startOfDay from 'date-fns/startOfDay';
import Reports from '../../collections/reports';
import Security from '../../utils/security';

async function getCashFlowReport({ startDate, endDate }) {
  this.unblock();
  Security.checkIfAdmin(this.userId);
  const result = await Reports.find({
    type: 'cashFlow',
    created: {
      $gt: startOfDay(startDate),
      $lte: endOfDay(endDate)
    }
  }).fetch();
  return result;
}

Meteor.methods({ 'accounting.getCashFlowReport': getCashFlowReport });
