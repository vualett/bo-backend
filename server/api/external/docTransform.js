import { Meteor } from 'meteor/meteor';

export function customerTransform(customer) {
  const tranformed = {
    _id: customer._id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.emails[customer.emails.length - 1].address,
    createdAt: customer.createdAt
  };
  return tranformed;
}

// CASH ADVANCES DOC TRANSFORM
export function dealTransform(doc) {
  const tranformed = doc;
  tranformed.customer = Meteor.users.findOne(
    { _id: doc.userId },
    {
      fields: {
        firstName: 1,
        lastName: 1,
        metrics: 1,
        createdAt: 1,
        currentCashAdvance: 1,
        phone: 1,
        lastCall: 1
      }
    }
  );

  // if (!tranformed.customer) throw new Meteor.Error('error on api request');

  return tranformed;
}
