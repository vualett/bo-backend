import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import agenda from '../../agenda/agenda';
import Security from '../../utils/security';

async function paymentsWithoutScheduledJob() {
  Security.checkIfAdmin(this.userId);
  const deals = Deals.find({ status: 'active' }).fetch();

  const dealsJOb = deals.map(async (d) => {
    const job = await agenda.jobs({ 'data.dealId': d._id });
    return { ...d, job };
  });

  const result = await Promise.all(dealsJOb);
  const result2 = result.filter((r) => !r.job.length > 0).map((r) => r.userId);
  return result2;
}

Meteor.methods({
  'audit.paymentsWithoutScheduledJob': paymentsWithoutScheduledJob
});
