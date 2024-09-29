import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import demoCA from './demoCA';
import Security from '../../utils/security';

async function createDemoCA(userId) {
  check(userId, String);
  Security.checkRole(this.userId, 'super-admin');

  const user = Meteor.users.findOne({ _id: userId });

  if (user.currentCashAdvance && user.currentCashAdvance.status === 'active')
    throw new Meteor.Error('Already has a CA');

  const _demoCA = demoCA;
  _demoCA._id = userId;
  _demoCA.userId = userId;

  const set = {
    currentCashAdvance: {
      id: _demoCA._id,
      status: 'active',
      amount: _demoCA.amount,
      createdAt: _demoCA.createdAt,
      isDemo: true
    },
    demoCashAdvance: _demoCA
  };

  Meteor.users.update({ _id: userId }, { $set: set });
}

async function removeDemoCA(userId) {
  check(userId, String);
  Security.checkRole(this.userId, 'super-admin');

  Meteor.users.update({ _id: userId }, { $set: { currentCashAdvance: false, demoCashAdvance: false } });
}

Meteor.methods({
  'users.createDemoCA': createDemoCA,
  'users.removeDemoCA': removeDemoCA
});
