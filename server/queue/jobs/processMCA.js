import { Meteor } from 'meteor/meteor';
import axios from 'axios';
import logger from '../../logger/log';
import { SERVICES_AGREEMENT_PROCESSOR } from '../../keys';

const JOB_NAME = 'processMCA';
const RUNNING_TIME = 'in 1 seconds';

function defineJob(Queue) {
  Queue.define(JOB_NAME, async (job, done) => {

    try {
      const config = {
        method: 'post',
        url: `${SERVICES_AGREEMENT_PROCESSOR}/agreementProcessor`,
        headers: {
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({ ...job.attrs.data, type: 'mca' })
      };

      const { data } = await axios(config);

      if (data.success) {
        job.attrs.results = data;
        return;
      }

      job.fail(data);
    } catch (error) {
      logger.error(`processMCA ${error}`);
      job.fail(`${error}`);
    } finally {
      done();
    }
  });
}

async function runJob(Queue, item) {
  if (!item.dealId) return;
  try {
    const job = await Queue.create(JOB_NAME, item);
    await job.schedule(RUNNING_TIME);
    await job.save();
  } catch (error) {
    logger.error(`processMCA ${error}`);
    throw new Meteor.Error(error);
  }
}

export default { JOB_NAME, defineJob, runJob };
