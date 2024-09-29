import { Meteor } from 'meteor/meteor';
import changeStatus from '../../../methods/users/changeStatus';
import { STAGE, STATUS } from '../../../consts/user';
import logger from '../../../../server/logger/log';
import changeSubStatus from '../../../methods/users/changeSubStatus';

export default async function markPhoneCallInit({ PHONE_NUMBER }, end) {

  try {
    const user = await Meteor.users.findOne({
      $or: [{ 'phone.number': `${PHONE_NUMBER}` }, { 'phone.others.number': `${PHONE_NUMBER}` }]
    });

    if (!user) {
      throw new Meteor.Error('USER_NOT_FOUND');
    }

    const set = { oncall: true };

    if (end) {
      set.oncall = false;
    }
    else {

      if ([STAGE.SALES.STAGE_6, STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10].includes(user?.offStage?.stage)) {

        if (user?.offStage?.stage === STAGE.SALES.STAGE_6) {
          await changeStatus({
            userId: user._id,
            status: STATUS.SALES_ASSISTING_CUSTOMER
          });

        } else if ([STATUS.DEACTIVATED, STATUS.WAITING_FOR_CLIENT_REQUEST].includes(user?.offStage?.status)) {
          await changeSubStatus({
            userId: user._id,
            subStatus: undefined
          });

        }
      }

    }

    Meteor.users.update(
      {
        _id: user._id
      },
      { $set: set }
    );

  } catch (error) {
    logger.error(`markPhoneCallInit ${error}`);
  }
}
