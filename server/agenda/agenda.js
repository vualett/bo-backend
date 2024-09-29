import { Agenda } from '@hokify/agenda';
import { Meteor } from 'meteor/meteor';
import checkDeposits from './jobs/check_deposits';
import todaysPaymentsBatch from './jobs/todaysPaymentsBatch';
import generalMetricsReport from './jobs/generalMetricsReport';
import sendDwollaBalanceNotification from './jobs/sendDwollaBalanceNotification';
import generateCustomDataTape from './jobs/generateCustomDataTape';
import generateDataTape from './jobs/generateDataTape';
import saveTodayCashFlow from './jobs/saveTodayCashFlow';
import resetAssignCount from './jobs/resetAssignCount';
import addToDwollaBalance from './jobs/addDwollaBalance';
import checkPendingPayments4Days from './jobs/checkPendingPayments4Days';
import paymentsNotStarted from './jobs/paymentsNotStarted';
import { sendNotification } from '../bot/sendNotification';
import sendAutomaticCheck2 from './jobs/sendAutomaticCheck2';
import sendCongratulationsToUsersWithBirthdays from './jobs/sendCongratulationsToUsersWithBirthdays';
import deleteChangesLogs from './jobs/deleteChangesLogs';
import addOverdueMetrics from './jobs/addOverdueMetrics';
import sendNotifyPayment from './jobs/sendNotifyPayment';
import transferDwollaBalanceToBank from './jobs/transferDwollaBalanceToBank';
import logger from '../logger/log';
import approvePendingDealTransfers from './jobs/approvePendingDealTransfers';
import getInitialDwollaBalanceJob from './jobs/getInitialDwollaBalance';
import todaysPaymentsBatchSameDayACHJob from './jobs/todaysPaymentsBatchSameDayACH';

const agenda = new Agenda({
  db: { address: process.env.MONGO_URL },
  maxConcurrency: 3,
  defaultConcurrency: 2
});

agenda.define('check_deposits', checkDeposits);
agenda.define('todaysPaymentsBatch', todaysPaymentsBatch);
agenda.define('generalMetricsReport', generalMetricsReport);
agenda.define('sendDwollaBalanceNotification', sendDwollaBalanceNotification);
agenda.define('generateDataTape', generateDataTape);
agenda.define('generateCustomDataTape', generateCustomDataTape);
agenda.define('saveTodayCashFlow', saveTodayCashFlow);
agenda.define('resetAssignCount', resetAssignCount);
agenda.define('addToDwollaBalance', addToDwollaBalance);
agenda.define('checkPendingPayments4Days', checkPendingPayments4Days);
agenda.define('paymentsNotStarted', paymentsNotStarted);
agenda.define('sendAutomaticCheck2', sendAutomaticCheck2);
agenda.define('sendNotifyPayment', sendNotifyPayment);
agenda.define('sendCongratulationsToUsersWithBirthdays', sendCongratulationsToUsersWithBirthdays);
agenda.define('deleteOldDataChangesLog', deleteChangesLogs);
agenda.define('addOverdueMetrics', addOverdueMetrics);
agenda.define('approvePendingDealTransfers', approvePendingDealTransfers);
agenda.define('transferDwollaBalanceToBank', transferDwollaBalanceToBank);


async function setRecurring() {
  await agenda.every('30 minutes', 'sendDwollaBalanceNotification');
  await agenda.every('0 23 * * *', 'check_deposits');
  await agenda.every('0 12 * * *', 'todaysPaymentsBatch');
  await agenda.every('0 4 * * *', 'generateDataTape');
  await agenda.every('0 20 * * *', 'generateCustomDataTape');
  await agenda.every('58 3 * * *', 'generalMetricsReport');
  await agenda.every('0 10 * * *', 'saveTodayCashFlow');
  await agenda.every('58 3 * * *', 'resetAssignCount');
  await agenda.every('0 11 * * 1-5', 'addToDwollaBalance');
  await agenda.every('0 19 * * *', 'checkPendingPayments4Days');
  await agenda.every('25 20 * * 1-5', 'paymentsNotStarted');
  await agenda.every('0 12 * * 1-5', 'sendAutomaticCheck2', undefined, { timezone: 'America/New_York' });
  await agenda.every('0 14 * * 1-5', 'sendNotifyPayment');
  await agenda.every('0 13 * * *', 'sendCongratulationsToUsersWithBirthdays');
  await agenda.every('0 0 */3 * *', 'deleteOldDataChangesLog');
  await agenda.every('0 0 * * *', 'addOverdueMetrics');
  await agenda.every('0,30 10-12,13-19 * * 1-6', 'approvePendingDealTransfers', undefined, { timezone: 'America/New_York' });
  await agenda.every('30 8 * * 1-5', 'transferDwollaBalanceToBank', undefined, { timezone: 'America/New_York' });
  await getInitialDwollaBalanceJob(agenda, '0 10 * * 1-5');
  await todaysPaymentsBatchSameDayACHJob(agenda, '0 14 * * 1-5');
}

agenda.on(
  'complete:todaysPaymentsBatch',
  Meteor.bindEnvironment(({ attrs }) => {
    sendNotification(
      `*PAYMENTS (Standard ACH) *
      TO INITIATE:  \`${attrs.results.paymentsForToday - attrs.results.notToInitiate}\`
      NOT INITIATE: \`${attrs.results.notToInitiate + attrs.results.skipped}\` `
    );
  })
);


export async function agendaInit() {
  await agenda.start();
  await setRecurring();
  logger.info('Agenda::started');
}

export default agenda;
