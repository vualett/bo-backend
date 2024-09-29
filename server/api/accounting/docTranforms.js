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

export function dealTransform(deal, options) {
  const tranformed = {
    cashAdvanceID: deal._id,
    userID: deal.userId,
    status: deal.state ? deal.state : deal.status,
    amount: deal.amount,
    fee: deal.amount * deal.fee,
    date: deal.activateAt,
    numberOfPayments: deal.numberOfPayments
  };

  if (options.payments && deal.payments) {
    tranformed.payments = options.directDeposit
      ? deal.payments.filter((p) => p.status === 'paid')
      : deal.payments.filter((p) => p.status === 'paid' && p.transferUrl);
  }

  if (!deal.transferUrl) throw new Meteor.Error('error on api request');
  tranformed.transferID = deal.transferUrl.split('/').pop();

  if (options.customer) {
    tranformed.customer = Meteor.users.findOne(
      { _id: deal.userId },
      {
        fields: {
          firstName: 1,
          lastName: 1,
          emails: 1,
          createdAt: 1
        },
        transform: customerTransform
      }
    );
    if (!tranformed.customer) throw new Meteor.Error('error on api request');
  }

  return tranformed;
}
