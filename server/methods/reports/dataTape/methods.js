import { Meteor } from 'meteor/meteor';
import { startOfYear } from 'date-fns';
import Security from '../../../utils/security';
import dataReportsMakeReport from './makeReport';
import { ReportsCollection } from '../../../collections/reports';

async function getReports({ custom }) {
  const pipeline = [
    {
      $match: {
        type: 'fullTape',
        ...(custom ? { custom: true } : { custom: { $exists: false } }),
        created: { $gte: startOfYear(new Date()) }
      }
    },
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

Meteor.methods({
  'dataTape.getReports': function getReportsMethod(params) {
    this.unblock();
    Security.checkIfAdmin(this.userId);
    return getReports(params);
  },
  'dataTape.makeReport': function makeReportMethod(params) {
    this.unblock();
    Security.checkIfAdmin(this.userId);
    return dataReportsMakeReport(params);
  }
});
