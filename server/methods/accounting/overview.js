import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';
import collection from './collection';
import accountsInDefault from './default';
import withOverdue from './withOverdue';

function overview(dates) {
  this.unblock();
  Security.checkIfAdmin(this.userId);
  const _collection = collection(dates);
  const inDefault = accountsInDefault();
  const overdue = withOverdue();

  return { inDefault, overdue, collection: _collection };
}

Meteor.methods({ 'accounting.overview': overview });
