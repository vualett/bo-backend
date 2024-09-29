import { Meteor } from 'meteor/meteor';
import createArgyleReport from './createArgyleReport';
import getArgyleReportsById from './getReportsById';
import getAllArgyleReportsByUserId from './getAllArgyleReportsByUserId';
import addArgyleAccount from './addArgyleAccount';
import getUserToken from './getUserToken'
  ;
Meteor.methods({
  'argyle.createReport': createArgyleReport,
  'argyle.getReportsList': getAllArgyleReportsByUserId,
  'argyle.getReport': getArgyleReportsById,
  'argyle.addArgyleAccount': addArgyleAccount,
  'getUserToken.argyle': getUserToken
});