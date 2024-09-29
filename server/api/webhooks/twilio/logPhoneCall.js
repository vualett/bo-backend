import { Meteor } from 'meteor/meteor';
import Logs from '../../../collections/logs';

export default function logPhoneCall(call) {
  const { CALL_TYPE, PHONE_NUMBER, USER_ID, START_DATE, DURATION } = call;

  if (CALL_TYPE === 'outbound') {
    const user = Meteor.users.findOne({ 'b24.userID': USER_ID });
    if (!user) return;

    const customer = Meteor.users.findOne({ 'phone.number': `${PHONE_NUMBER}` });
    if (!customer) return;

    const log = {
      type: 'call',
      callType: CALL_TYPE,
      callDuration: DURATION,
      userId: customer._id,
      who: {
        name: `${user.firstName} ${user.lastName || ''}`,
        id: user._id
      },
      timestamp: new Date(START_DATE)
    };

    Logs.insert(log);

    Meteor.users.update({ _id: customer._id }, { $set: { lastCall: log } });
  }
}
