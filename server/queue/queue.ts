import os from 'os';
import { Agenda } from '@hokify/agenda';
import processDeal from './jobs/processDeal';
import processPayment from './jobs/processPayment';
import initiatePayment from './jobs/initiatePayments';
import processMCA from './jobs/processMCA';
import checkUserAndSuspend from './jobs/checkUserAndSuspend';
import endSuspension from './jobs/endSuspension';
import clearBatchRescheduleHold from './jobs/clearBatchRescheduleHold';
import callbackNotification from './jobs/callbackNotification';
import reevaluateClient from './jobs/reevaluateClient';
import requalifyClient from './jobs/requalifyClient';
import sendDeclinedPaymentSMS from './jobs/sendDeclinedPaymentSMS';
import * as removeUnqualifiedAssignment from './jobs/removeUnqualifiedAssignment';
import checkIfDealIsNotTaken from './jobs/checkIfDealIsNotTaken';
import checkMissingRequirements from './jobs/checkMissingRequirements';
import processDISCLOSURE from './jobs/processDISCLOSURE';
import * as deleteCustomerAccountJob from './jobs/deleteCustomerAccountJob';
import * as argyleReportById from './jobs/argyleReportById';
import * as cyclicReappointmentSchedulerJob from './jobs/cyclicReappointmentSchedulerJob';
import * as birthdaySchedulerUnderageJob from './jobs/birthdaySchedulerUnderageJob';
import * as sendEmail from './jobs/sendEmail';
import * as createOverdueJiraTasks from './jobs/CreateOverdueJiraTasks';
import * as sendReminderToTakeCashAdvance from './jobs/sendReminderToTakeCashAdvanceJob';
import logger from '../logger/log';
import * as markUserAsInfoNeededNotProvided from './jobs/markUserAsInfoNeededNotProvidedJob';

// import approveDealTransfer from './jobs/approveDealTransfer';

interface ParametersProcessDeal {
  dealId: string;
}

interface ParametersProcessPayment extends ParametersProcessDeal {
  transferUrl: string;
}

interface ParametersInitiatePayment extends ParametersProcessDeal {
  userId: string;
  paymentNumber: number;
  idempotencyKey: string;
  amount: number;
}

interface ParametersProcessMCA extends ParametersProcessDeal {
  userId: string;
  date: string;
  amount: number;
  specifiedAmount: number;
  weeklyTransfer: number;
  specifiedPercentage: number;
  base64Sign: string;
  averageVerifiedHistoricalRevenue: number;
  designatedAccount: string;
}
interface ParametersProcessDISCLOSURE extends ParametersProcessDeal {
  name: string;
  date: string;
  purchasePrice: number;
  weeklyTransfer: number;
  specifiedPercentage: number;
  averageVerifiedHistoricalRevenue: number;
  state: string;
  estimatedAnnualPercentage: string;
  term: string;
  monthTransfer: number;
  validAmountSold: number;
}

interface ParametersCheck {
  userId: string;
  schedule: string;
}

interface ParametersEndSuspension {
  userId: string;
  weeks: string;
}

interface ParametersClearBatchRescheduleHold {
  userId: string;
}

interface ParametersCallbackNotification {
  name: string;
  callbackTo: string;
  uniqueId: string;
  by: {
    name: string;
    id: string;
  };
  callbackDate: number;
}

interface ParametersClient {
  userId: string;
  reevaluationDate: number;
}

interface ParametersRemoveUnqualifiedAssignment {
  userId: string;
}
interface ParametersEmail {
  to: string;
  subject: string;
  html: string;
}

interface ParametersBirthdayScheduler {
  id: string;
  note: string;
  callbackDate: Date;
  isInvitation?: boolean;
}

enum TypeOfIssue {
  TASK = 'Task',
  URGENT = 'Urgent'
}

interface ParametersCreateOverdueJiraTask {
  dealID: string;
  paymentNumber: number;
  returnCode: string;
  typeOfIssue: TypeOfIssue;
}

interface ParametersDeclinedPaymentSMS extends ParametersProcessDeal {
  userId: string;
  paymentNumber: number;
  notifyUserBody: string;
}
const hostname = os.hostname();
const { NODE_APP_INSTANCE } = process.env;

const Queue = new Agenda({
  db: {
    address: process.env.MONGO_URL,
    collection: 'jobQueue'
  },
  name: `${hostname}-${NODE_APP_INSTANCE as string}`,
  defaultConcurrency: 4,
  defaultLockLimit: 5
});

processDeal.defineJob(Queue);
processPayment.defineJob(Queue);
initiatePayment.defineJob(Queue);
processMCA.defineJob(Queue);
processDISCLOSURE.defineJob(Queue);
checkUserAndSuspend.defineJob(Queue);
endSuspension.defineJob(Queue);
clearBatchRescheduleHold.defineJob(Queue);
callbackNotification.defineJob(Queue);
reevaluateClient.defineJob(Queue);
requalifyClient.defineJob(Queue);
removeUnqualifiedAssignment.defineJob(Queue);
checkIfDealIsNotTaken.defineJob(Queue);
checkMissingRequirements.defineJob(Queue);
deleteCustomerAccountJob.defineJob(Queue);
argyleReportById.defineJob(Queue);
cyclicReappointmentSchedulerJob.defineJob(Queue);
birthdaySchedulerUnderageJob.defineJob(Queue);
sendEmail.defineJob(Queue);
createOverdueJiraTasks.defineJob(Queue);
sendDeclinedPaymentSMS.defineJob(Queue);
sendReminderToTakeCashAdvance.defineJob(Queue);
markUserAsInfoNeededNotProvided.defineJob(Queue);
// approveDealTransfer.defineJob(Queue);

export default Queue;

export async function queueInit(): Promise<void> {
  await Queue.start();
  logger.info('Queue::started');
}

Queue.on('start', (job) => {
  logger.info(
    `Job ${job.attrs.name} starting on instance#${NODE_APP_INSTANCE as string} jobId: ${job.attrs._id as unknown as string
    }`
  );
});

export const queueProcessDeal = async (item: ParametersProcessDeal): Promise<void> =>
  await processDeal.runJob(Queue, item);

export const queueProcessPayment = async (item: ParametersProcessPayment): Promise<void> =>
  await processPayment.runJob(Queue, item);

export const queueInitiatePayment = async (item: ParametersInitiatePayment): Promise<void> =>
  await initiatePayment.runJob(Queue, item);

export const queueProcessMCA = async (item: ParametersProcessMCA): Promise<void> =>
  await processMCA.runJob(Queue, item);

export const queueProcessDISCLOSURE = async (item: ParametersProcessDISCLOSURE): Promise<void> =>
  await processDISCLOSURE.runJob(Queue, item);

export const queueCheckUserAndSuspend = async (item: ParametersCheck): Promise<void> =>
  await checkUserAndSuspend.runJob(Queue, item);

export const queueCheckIfDealIsNotTaken = async (item: ParametersCheck): Promise<void> =>
  await checkIfDealIsNotTaken.runJob(Queue, item);

export const queueCheckMissingRequirements = async (item: ParametersCheck): Promise<void> =>
  await checkMissingRequirements.runJob(Queue, item);

export const queueEndSuspension = async (item: ParametersEndSuspension): Promise<void> =>
  await endSuspension.runJob(Queue, item);

export const queueClearBatchRescheduleHold = async (item: ParametersClearBatchRescheduleHold): Promise<void> =>
  await clearBatchRescheduleHold.runJob(Queue, item);

export const queueCallbackNotification = async (item: ParametersCallbackNotification): Promise<void> =>
  await callbackNotification.runJob(Queue, item);

export const queueReevaluateClient = async (item: ParametersClient): Promise<void> =>
  await reevaluateClient.runJob(Queue, item);

export const queueRequalifyClient = async (item: ParametersClient): Promise<void> =>
  await requalifyClient.runJob(Queue, item);

export const queueRemoveUnqualifiedAssignment = async (item: ParametersRemoveUnqualifiedAssignment): Promise<void> =>
  await removeUnqualifiedAssignment.runJob(Queue, item);

export const queueDeleteCustomerAccount = async (item: string): Promise<void> =>
  await deleteCustomerAccountJob.runJob(Queue, item);

export const queueGetReportById = async (item: string): Promise<void> => await argyleReportById.runJob(Queue, item);

export const queueCyclicReappointmentScheduler = async (item: string): Promise<void> =>
  await cyclicReappointmentSchedulerJob.runJob(Queue, item);

export const queueBirthdayScheduler = async (item: ParametersBirthdayScheduler): Promise<void> =>
  await birthdaySchedulerUnderageJob.runJob(Queue, item);

export const queueSendEmail = async (item: ParametersEmail): Promise<void> => await sendEmail.runJob(Queue, item);

export const queueCreateOverdueJiraTasks = async (item: ParametersCreateOverdueJiraTask): Promise<void> =>
  await createOverdueJiraTasks.runJob(Queue, item);

export const queueSendDeclinedPaymentSMS = async (item: ParametersDeclinedPaymentSMS): Promise<void> => {
  await sendDeclinedPaymentSMS.runJob(Queue, item);
};

export const queueSendReminderToTakeCashAdvance = async (item: string): Promise<void> => {
  await sendReminderToTakeCashAdvance.runJob(Queue, item);
};

export const queueMarkUserAsInfoNeededNotProvided = async (item: string): Promise<void> => {
  await markUserAsInfoNeededNotProvided.runJob(Queue, item);
};

// export const queueApproveDealTransfer = async (item: string): Promise<void> => {
//   await approveDealTransfer.runJob(Queue, item);
// };