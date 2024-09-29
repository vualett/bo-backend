import { Meteor } from 'meteor/meteor';
import { parsePhoneNumber } from 'libphonenumber-js';
import Security from '../../utils/security';

function findWith(option) {
  Security.checkIfAdmin(this.userId);
  let user = false;

  const options = {
    fields: { _id: 1, firstName: 1, lastName: 1 }
  };

  if (option.phone) {
    const phoneNumber = parsePhoneNumber(option.phone, 'US');
    const query = {
      $or: [{ 'phone.others.number': phoneNumber.number }, { 'phone.number': phoneNumber.number }]
    };
    user = Meteor.users.findOne(query, options);
  }

  if (option.email) {
    const query = {
      'emails.address': option.email
    };
    user = Meteor.users.findOne(query, options);
  }

  return user;
}

Meteor.methods({ 'users.findWith': findWith });
