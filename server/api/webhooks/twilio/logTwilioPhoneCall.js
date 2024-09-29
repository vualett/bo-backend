import { Meteor } from 'meteor/meteor';
import Logs from '../../../collections/logs';
import Invitations from '../../../collections/invitations';

export default async function logPhoneCall(call) {
  const { CALL_TYPE, PHONE_NUMBER, USER_ID, START_DATE, DURATION } = call;
  const user = Meteor.users.findOne({ 'emails.address': USER_ID });
  if (!user) return;

  const customer = Meteor.users.findOne({
    'phone.number': `${PHONE_NUMBER}`
  });

  if (customer) {
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
  } else {
    const invitation = Invitations.findOne(
      {
        'phone.number': PHONE_NUMBER
      },
      { sort: { when: -1 } }
    );

    if (invitation) {
      const log = {
        type: 'call',
        callType: CALL_TYPE,
        callDuration: DURATION,
        invitationId: invitation._id,
        who: {
          name: `${user.firstName} ${user.lastName || ''}`,
          id: user._id
        },
        timestamp: new Date(START_DATE)
      };

      Logs.insert(log);

      Invitations.update(
        { _id: invitation._id },
        {
          $set: {
            lastCall: log
          }
        }
      );
    }
  }
}
