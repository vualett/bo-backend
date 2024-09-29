import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Security from '../../utils/security';
import AssetReports from '../../collections/assetReports';

function findRelations_DL_OCR(payload) {
  check(payload, {
    state: String,
    id: String
  });
  const { state, id } = payload;

  const results = Meteor.users
    .find({
      'documents.driverLicense.info.state': state,
      'documents.driverLicense.info.id': id
    })
    .fetch();
  if (results) return results.map((r) => ({ userID: r._id, name: `${r.firstName} ${r.lastName}` }));
  return false;
}

function findRelations_BANKINFO(payload) {
  check(payload, {
    institution_id: String,
    mask: String,
    name: String
  });

  const { institution_id, mask, name } = payload;
  const query = {
    $and: [{ 'bankAccount.institution_id': institution_id }, { 'bankAccount.mask': mask }, { 'bankAccount.name': name }]
  };
  const results = Meteor.users.find(query).fetch();
  if (results) return results.map((r) => ({ userID: r._id, name: `${r.firstName} ${r.lastName}` }));
  return false;
}

function findRelations_AR_BANKINFO(payload) {
  check(payload, {
    bank: String,
    mask: String
  });
  const { bank, mask } = payload;

  const results = AssetReports.find({
    'items.institution_name': bank,
    'items.accounts.mask': mask
  }).fetch();

  if (results) {
    const mapped = results.map((r) => ({ userID: r.user.client_user_id }));
    const uniq = [...new Set(mapped)];

    return uniq;
  }
  return false;
}

function findRelations_AR_NAME(payload) {
  check(payload, {
    name: String
  });
  const { name } = payload;

  const results = AssetReports.find({
    'items.accounts.owners.names': name
  }).fetch();

  if (results) {
    const mapped = results.map((r) => ({ userID: r.user.client_user_id }));
    const uniq = [...new Set(mapped)];

    return uniq;
  }
  return false;
}

Meteor.methods({
  'users.findRelations': function findRelations({ where, payload }) {
    Security.checkIfAdmin(this.userId);
    check(where, String);
    check(payload, Object);

    if (where === 'DL_OCR') return findRelations_DL_OCR(payload);
    if (where === 'BANKINFO') return findRelations_BANKINFO(payload);
    if (where === 'AR_BANKINFO') findRelations_AR_BANKINFO(payload);
    if (where === 'AR_NAME') findRelations_AR_NAME(payload);

    return false;
  }
});
