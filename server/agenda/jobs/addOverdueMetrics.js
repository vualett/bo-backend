import { addOverdueMetrics } from '../../methods/accounting/withOverdue';

export default async function addOverdueMetricsJob(job, done) {
  try {
    await addOverdueMetrics();
    done();
  } catch (error) {
    const { message } = error;

    job.fail(message);
    done();
  }
}
