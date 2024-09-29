import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import insertLog from '../../logs/insertGenericLog';
import Security from '../../../utils/security';
import { insertDataChangesLog } from '../../../dataChangesLogs';

function removeBonus({ userId, bonus }) {
  check(userId, String);
  check(bonus, Number);

  const query = { _id: userId };

  const user = Meteor.users.findOne(query);

  if (bonus > user.bonusAvailable) throw new Meteor.Error('AMOUNT HIGHER THAN AVAILABLE');

  Meteor.users.update(query, { $inc: { bonusAvailable: -bonus } });

  insertLog(userId, `$${bonus} bonus removed`);

  const currentBonusAvailable = user.bonusAvailable || 0;

  insertDataChangesLog({
    where: 'user',
    documentID: userId,
    operation: 'update',
    method: 'removeBonus',
    createdBy: Meteor.userId(),
    old_data: user.bonusAvailable,
    new_data: currentBonusAvailable - bonus
  });
}

Meteor.methods({
  'users.removeBonus': function removeBonusMethod(request) {
    Security.checkRole(this.userId, ['technical']);
    removeBonus(request);
  }
});
