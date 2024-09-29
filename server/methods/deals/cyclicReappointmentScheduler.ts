import batchReschedule from './reschedulePayments/batchReschedule';

const cyclicReappointmentScheduler = async (dealId: string): Promise<void | never> => {
  await batchReschedule(dealId, true, true);
};

export default cyclicReappointmentScheduler;
