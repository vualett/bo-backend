import cron from 'node-cron';
import { Meteor } from 'meteor/meteor';
import { makeReport } from '../methods/accounting/report';
import dataReportsMakeReport from '../methods/reports/dataTape/makeReport';
// import makeAgingReport from "../methods/reports/agingPayments";

const makeDeepReportJob = Meteor.bindEnvironment(async () => makeReport());
const makeDataTapeReportJob = Meteor.bindEnvironment(async () => dataReportsMakeReport());
// const makeAgingReportJob = Meteor.bindEnvironment(async () => makeAgingReport());

// '0 17 * * *', =  1PM
cron.schedule('0 17 * * *', makeDeepReportJob);

// '0 17 * * *', =  6AM
cron.schedule('0 10 * * *', makeDataTapeReportJob);

// '0 17 * * *', =  4AM
// cron.schedule("0 8 * * *", makeAgingReportJob);
