import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import { Agenda, Job } from '@hokify/agenda';
import { createOrUpdateODTask } from '../../methods/tasks/overdue/createOrUpdateODTask';

enum TypeOfIssue {
  TASK = 'Task',
  URGENT = 'Urgent'
}
interface ItemParameters {
  dealID: string;
  paymentNumber: number;
  returnCode: string;
  typeOfIssue: TypeOfIssue;
}

export const JOB_NAME = 'createOverdueJiraTasks';

const declareJob = async (job: Job<ItemParameters>, done: (error?: Error | undefined) => void): Promise<void> => {
  const { dealID, paymentNumber, returnCode, typeOfIssue } = job.attrs.data;

  try {
    await createOrUpdateODTask({
      dealID,
      paymentNumber,
      returnCode,
      typeOfIssue
    });

    done();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;

    job.fail(message);

    done();
  }
};

export const defineJob = (Queue: Agenda): void => Queue.define(JOB_NAME, declareJob, { concurrency: 1 });

export const runJob = async (Queue: Agenda, item: ItemParameters): Promise<void> | never => {
  try {
    const job = Queue.create(JOB_NAME, item);
    job.schedule('in 3 minutes');
    job.unique({
      'data.dealID': item.dealID,
      'data.returnCode': item.returnCode,
      'data.paymentNumber': item.paymentNumber
    });
    await job.save();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;

    logger.error(`[FUNCTION:CreateOverdueJiraTasks] ${message}`);
    throw new Meteor.Error(message);
  }
};
