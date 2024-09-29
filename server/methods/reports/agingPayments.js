import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';
import getData from '../../api/getfile/aging/getAgingData';
import Reports, { ReportsCollection } from '../../collections/reports';

import getAgingDBData from '../../api/getfile/aging/getDBData';
import processData from '../../api/getfile/aging/processData';

async function getReports() {
  const pipeline = [
    { $match: { type: 'agingPayments' } },
    { $sort: { created: -1 } },
    {
      $group: {
        _id: { $dayOfYear: '$created' },
        report: { $first: '$$ROOT' }
      }
    },
    { $sort: { _id: -1 } },
    { $limit: 10 },
    { $project: { report: 1, _id: 0 } },
    { $replaceRoot: { newRoot: '$report' } }
  ];
  return ReportsCollection.aggregate(pipeline).toArray();
}

export default async function makeAgingReport() {
  const dates = { start: '2019/01/01' };

  const reportID = Reports.insert({
    type: 'agingPayments',
    ready: false,
    created: new Date(),
    report: false
  });

  const data = await getData(dates);

  Reports.update({ _id: reportID }, { $set: { report: data, ready: true } });

  return true;
}

Meteor.methods({
  'reports.aging.get': function getReportsMethod() {
    this.unblock();
    Security.checkIfAdmin(this.userId);
    return getReports();
  },
  'reports.aging.make': function makeReportMethod() {
    this.unblock();
    Security.checkIfAdmin(this.userId);
    return makeAgingReport();
  },
  'reports.aging.getRawData': async function makeReportMethod() {
    this.unblock();
    Security.checkIfAdmin(this.userId);
    const dates = { start: '2018/01/01', end: '2021/01/01' };
    const data = await getAgingDBData(dates);

    const dataProcessed = processData(data, true);
    return dataProcessed;
  }
});
