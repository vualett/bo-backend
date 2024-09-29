import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { parsePhoneNumber } from 'libphonenumber-js';
import Security from '../../utils/security';
import { checkIfPhoneNumberExist } from '../../accounts/utils';
import { insertDataChangesLog } from '../../dataChangesLogs';
import Invitations from '../../../server/collections/invitations';
async function addNumber(userId, _number) {
  check(userId, String);
  check(_number, String);

  Security.checkAccess(Meteor.userId(), ['addPhone']);

  const { number: phoneNumber } = parsePhoneNumber(_number, 'US');

  checkIfPhoneNumberExist(phoneNumber);

  Meteor.users.update(
    { _id: userId },
    {
      $push: {
        'phone.others': {
          number: phoneNumber,
          added: new Date(),
          addedBy: Meteor.userId()
        }
      }
    }
  );
  Meteor.defer(async () => {
    await Invitations.update(
      { userId: userId },
      {
        $push: {
          phone: { number: phoneNumber, type: 'Secondary' }
        }
      }
    );
  });
}

async function addUserNumber(_number) {
  check(_number, String);

  Security.checkLoggedIn(this.userId);

  const { number: phoneNumber } = parsePhoneNumber(_number, 'US');

  checkIfPhoneNumberExist(phoneNumber);

  const user = Meteor.users.findOne({ _id: this.userId });

  if (!user) throw new Meteor.Error('User not found!');

  const { others, phone, ...rest } = user.phone;
  const oldMainNumber = rest;

  let _update;

  if (!!others && others.length) {
    _update = {
      $set: {
        'phone.number': phoneNumber,
        'phone.verified': true
      },
      $push: {
        'phone.others': oldMainNumber
      }
    };
  } else {
    _update = {
      $set: {
        'phone.number': phoneNumber,
        'phone.verified': true,
        'phone.others': [oldMainNumber]
      }
    };
  }

  insertDataChangesLog({
    where: 'users',
    documentID: this.userId,
    operation: 'update',
    method: 'mainNumberChange',
    createdBy: this.userId,
    old_data: oldMainNumber,
    new_data: {
      number: phoneNumber,
      verified: true
    }
  });
  Meteor.defer(() => {
    Invitations.update(
      { userId: this.userId },
      {
        $push: {
          phone: { number: phoneNumber, type: 'Secondary' }
        }
      }
    );
  });

  return Meteor.users.update({ _id: this.userId }, _update);
}

async function removeNumber(userId, _number) {
  check(userId, String);
  check(_number, String);

  Security.checkAccess(Meteor.userId(), ['addPhone']);

  const { number: phoneNumber } = parsePhoneNumber(_number, 'US');

  const user = Meteor.users.findOne({ _id: userId });
  if (!user.phone.others) return false;

  const old = user.phone.others.find((p) => p.number === phoneNumber);

  insertDataChangesLog({
    where: 'users',
    documentID: userId,
    operation: 'remove',
    method: 'removePhoneNumber',
    createdBy: this.userId,
    old_data: old
  });

  const updated = Meteor.users.update(
    { _id: userId },
    {
      $pull: {
        'phone.others': { number: phoneNumber }
      }
    }
  );
  Meteor.defer(async () => {
    await Invitations.update(
      { userId: userId },
      {
        $pull: {
          phone: { number: phoneNumber }
        }
      },
      false,
      false
    );
  });

  if (updated) return true;
  return false;
}

function setAsMainPhoneNumber(userID, newMainNumber) {
  check(userID, String);
  check(newMainNumber, String);
  Security.checkRole(this.userId, ['super-admin', 'admin', 'manager']);

  const { number: newMainPhoneNumber } = parsePhoneNumber(newMainNumber, 'US');
  const user = Meteor.users.findOne({ _id: userID });

  if (!user.phone.others) return false;
  if (user.phone.number === newMainPhoneNumber) return false;
  const { others, phone, ...rest } = user.phone;
  const oldMainNumber = rest;
  const secondaryNumber = user.phone.others.find((p) => p.number === newMainPhoneNumber);
  if (!secondaryNumber) return false;

  insertDataChangesLog({
    where: 'users',
    documentID: userID,
    operation: 'update',
    method: 'mainNumberChange',
    createdBy: this.userId,
    old_data: oldMainNumber,
    new_data: secondaryNumber
  });

  const operations = {
    $set: { 'phone.number': secondaryNumber.number, verified: false },
    $push: { 'phone.others': oldMainNumber }
  };

  const updated = Meteor.users.update({ _id: userID }, operations);
  if (updated) {
    Meteor.users.update(
      { _id: userID },
      {
        $pull: {
          'phone.others': { number: secondaryNumber.number }
        }
      }
    );
  }
  return true;
}

Meteor.methods({
  'users.addPhoneNumber': addNumber,
  'user.addPhoneNumber': addUserNumber,
  'users.removeSecondaryPhoneNumber': removeNumber,
  'users.setAsMainPhoneNumber': setAsMainPhoneNumber
});
