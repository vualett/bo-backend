import './deals';

Meteor.users.before.update((userId, doc) => {
  doc.modifiedAt = new Date();
});
