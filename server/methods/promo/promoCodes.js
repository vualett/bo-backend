import { Meteor } from 'meteor/meteor';

import { check } from 'meteor/check';
import Security from '../../utils/security';

import PromoCodes from '../../../server/collections/promoCodes';

export default PromoCodes;

export function checkPromoCode(code) {
  check(code, String);
  const trimmedCode = code.trim().toLowerCase();

  const codeFound = PromoCodes.findOne({ _id: trimmedCode });
  if (!codeFound) throw new Meteor.Error('NOT_FOUND');
  if (!codeFound.enable) throw new Meteor.Error('EXPIRED');
  if (codeFound.type === 'promoterCode') {
    return 'promoterCode';
  } else {
    return 'promoCode';
  }
}

function editPromoterCode(code, newCodeId) {
  Security.checkRole(this.userId, ['super-admin', 'technical']);
  check(code, String);
  check(newCodeId, String);
  const codeFound = PromoCodes.findOne({ _id: newCodeId });
  if (codeFound) throw new Meteor.Error('CODE_ALREADY_USED');

  const oldCode = PromoCodes.findOne({ _id: code });

  const newCode = {
    ...oldCode,
    _id: newCodeId,
    createdBy: this.userId
  };
  PromoCodes.insert(newCode);
  Meteor.users.update(
    {
      _id: oldCode.promoterId
    },
    {
      $set: {
        ownerPromoterCode: newCodeId
      }
    }
  );
  PromoCodes.remove({ _id: code });
  return true;
}
function createPromoCode({ type, code, promoterId }) {
  this.unblock();
  Security.checkRole(this.userId, ['super-admin', 'technical']);

  check(code, String);
  check(type, String);
  if (promoterId) check(promoterId, String);
  const codeFound = PromoCodes.findOne({ _id: code });
  if (codeFound) throw new Meteor.Error('CODE_ALREADY_USED');
  if (!code) return false;

  const newCode = {
    _id: code,

    type,
    createdAt: new Date(),
    enable: true,
    count: 0,
    createdBy: this.userId
  };
  if (promoterId) {
    newCode.promoterId = promoterId;
    Meteor.users.update(
      {
        _id: promoterId
      },
      {
        $set: {
          ownerPromoterCode: code
        }
      }
    );
  }

  PromoCodes.insert(newCode);

  return true;
}
function deletePromoCode(code) {
  Security.checkRole(this.userId, ['super-admin', 'technical']);
  check(code, String);
  PromoCodes.remove({ _id: code });
  return true;
}
function getPromoCode() {
  Security.checkRole(this.userId, ['super-admin', 'technical']);

  return PromoCodes.find({}).fetch();
}

Meteor.methods({
  'promoCode.check': function checkPromoCodeMethod(code) {
    this.unblock();
    check(code, String);
    return checkPromoCode(code);
  },
  'promoCode.create': createPromoCode,
  'promoCode.get': getPromoCode,
  'promoCode.edit': editPromoterCode,
  'promoCode.delete': deletePromoCode
});
