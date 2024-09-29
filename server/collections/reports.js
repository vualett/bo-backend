import { Mongo } from 'meteor/mongo';

const Reports = new Mongo.Collection('reports');
export const ReportsCollection = Reports.rawCollection();

export default Reports;
