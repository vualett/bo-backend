import { Meteor } from 'meteor/meteor';
import updateInteraction from '../../methods/users/updateInteraction';
import logger from '../../logger/log';
import sendTwilioMessage from '../../sms/sendTwilioMessage';
import Deals from '../../collections/deals';
import { STAGE, STATUS, SUB_STATUS, ROLE } from '../../consts/user';
import changeStatus from '../../methods/users/changeStatus';
import changeSubStatus from '../../methods/users/changeSubStatus';

const JOB_NAME = 'checkUserAndSuspend';

async function defineJob(Queue) {
  Queue.define(JOB_NAME, async (job, done) => {
    const { userId, schedule } = job.attrs.data;
    const query = { _id: userId };

    try {
      const user = Meteor.users.findOne(query);
      const cashAdvance = Deals.findOne({ userId, status: { $nin: ['completed', 'cancelled'] } });

      if (cashAdvance && user.category !== 'none') {
        done();
        return;
      }

      Meteor.users.update(query,
        {
          $set: {
            ...(user.category !== 'none' ? { previousCategory: user.category } : {}),
            category: 'none'
          }
        }
      );

      if (user?.interaction?.status === 'check2') {
        await sendTwilioMessage({
          body: 'For security reasons, your deal has been deactivated. If you want to be reactivated, contact us +1(844)-844-2488 or support@ualett.com. UALETT',
          service: 'accNotification',
          userId: user._id
        });
      }

      await updateInteraction({
        userId: user._id,
        status: 'deactivated',
        by: {
          name: 'system'
        },
        flow: schedule === 'in 31 day' ? ROLE.REPETITION : ROLE.ONBOARDING
      });

      if ([STAGE.SALES.STAGE_6, STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10].includes(user?.offStage?.stage)) {

        if (user?.offStage?.stage === STAGE.SALES.STAGE_6) {
          await changeStatus({
            userId: user._id,
            status: STATUS.DEACTIVATED_CUSTOMER
          });

        } else {
          await changeStatus({
            userId: user._id,
            status: STATUS.DEACTIVATED
          });

          await changeSubStatus({
            userId: user._id,
            subStatus: SUB_STATUS.ACTION_NEEDED
          });
        }
      }

      done();
    } catch (error) {
      logger.error(`checkUserAndSuspend ${error}`);
      job.fail(`checkUserAndSuspend ${error}`);
      done();
    }
  });
}

async function runJob(Queue, item) {
  if (!item.userId || !item.schedule) return;
  try {
    const job = await Queue.create(JOB_NAME, item);
    await job.schedule(item.schedule);
    await job.unique({ 'data.userId': item.userId });
    await job.save();
  } catch (error) {
    logger.error(`checkUserAndSuspend ${error}`);
    throw new Meteor.Error(error);
  }
}

export default { JOB_NAME, defineJob, runJob };
