import { Meteor } from 'meteor/meteor';

export default function setPaymentDay(userId, ISODay) {
  if (ISODay > 5) return false;

  Meteor.users.update({ _id: userId }, { $set: { paymentISODay: ISODay } });

  return true;
}
