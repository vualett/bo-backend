import { startOfYear, startOfQuarter, endOfQuarter, differenceInWeeks, endOfToday, getQuarter } from 'date-fns';
import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import collection from './collection';
import Security from '../../utils/security';

const MetricsReports = new Mongo.Collection('metrics_reports');

function thisYear() {
  const dates = {
    startDate: startOfYear(new Date()),
    endDate: endOfToday()
  };
  const _collection = collection(dates);

  const { principal, fee } = _collection.paid;
  const total = principal + fee;

  const weeks = differenceInWeeks(dates.endDate, dates.startDate);
  const AvgWeekly = _collection.paid.fee / weeks;

  return {
    principal,
    fee,
    total,
    AvgWeekly
  };
}

function quarterPerformance() {
  const thisYear = new Date().getFullYear();
  const thisQuarter = getQuarter(new Date());

  const Q1 = {
    startDate: startOfQuarter(new Date(thisYear, 0, 10)),
    endDate: endOfQuarter(new Date(thisYear, 0, 10))
  };

  const Q2 = {
    startDate: startOfQuarter(new Date(thisYear, 3, 10)),
    endDate: endOfQuarter(new Date(thisYear, 3, 10))
  };

  const Q3 = {
    startDate: startOfQuarter(new Date(thisYear, 6, 10)),
    endDate: endOfQuarter(new Date(thisYear, 6, 10))
  };

  const Q4 = {
    startDate: startOfQuarter(new Date(thisYear, 10, 10)),
    endDate: endOfQuarter(new Date(thisYear, 10, 10))
  };
  const Quarters = { Q1: collection(Q1) };

  if (thisQuarter > 1) Quarters.Q2 = collection(Q2);
  if (thisQuarter > 2) Quarters.Q3 = collection(Q3);
  if (thisQuarter > 3) Quarters.Q4 = collection(Q4);

  return Quarters;
}

export function makeReport() {
  const thisYearReport = thisYear();
  const quartersReport = quarterPerformance();

  MetricsReports.insert({
    thisyear: thisYearReport,
    quarters: quartersReport,
    created: new Date()
  });
  return 'done';
}

const MetricsReportsCollection = MetricsReports.rawCollection();

async function getReports() {
  const pipeline = [
    {
      $sort: {
        created: 1
      }
    },
    {
      $group: {
        _id: {
          $year: '$created'
        },
        report: {
          $last: '$$ROOT'
        }
      }
    },
    {
      $project: {
        _id: 0,
        report: 1
      }
    },
    {
      $replaceRoot: {
        newRoot: '$report'
      }
    }
  ];
  return MetricsReportsCollection.aggregate(pipeline, {
    allowDiskUse: true
  }).toArray();
}

Meteor.methods({
  'accounting.makeReport': function makeReportMethod() {
    this.unblock();
    Security.checkIfAdmin(this.userId);
    return makeReport();
  },
  'accounting.getReports': function getReportsMethod() {
    this.unblock();
    Security.checkIfAdmin(this.userId);
    return getReports();
  }
});

export default {};
