import logger from '../logger/log';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Security from '../utils/security';
import Notes from '../collections/notes';
import { ROLES } from '../consts/roles';

export function insertNote(note) {
  const { message, where, userId, dealId, by, type, flow, duplicatedAccountId, responsable } = note;

  check(message, String);
  check(where, String);

  const duplicatedAccount = duplicatedAccountId
    ? Meteor.users.findOne({ _id: duplicatedAccountId }, { fields: { firstName: 1, lastName: 1 } })
    : null;

  const noteObj = {
    message,
    where,
    userId,
    dealId,
    author:
      by === 'system'
        ? { name: 'system', id: 'system' }
        : by || {
          name: responsable ? responsable.firstName : Meteor.user().firstName,
          id: responsable ? responsable?._id : Meteor.userId()
        },
    createdAt: new Date(),
    type,
    flow,
    ...(duplicatedAccount ? { duplicatedAccount } : {})
  };

  const insert = Notes.insert(noteObj);

  return insert;
}

export function insertInvitationNote(note) {
  const { message, where, invitationId, by, type } = note;

  check(message, String);
  check(where, String);

  const noteObj = {
    message,
    invitationId,
    where,
    author: by,
    createdAt: new Date(),
    type,
    flow: ROLES.ONBOARDING
  };

  const insert = Notes.insert(noteObj);

  return insert;
}

async function getInvitationNotes({ invitationId }) {
  Security.checkIfAdmin(this.userId);
  try {
    check(invitationId, String);
    const result = await Notes.find({ invitationId }).fetch();
    return result;
  } catch (error) {
    logger.error(`[getInvitationNotes] ${JSON.stringify(error)}`);
    throw new Meteor.Error('Internal Server Error');
  }
}

function deleteNote(id) {
  check(id, String);
  Security.checkRole(this.userId, 'super-admin');
  Notes.remove({ _id: id });
}

function markAsImportant(id) {
  check(id, String);
  Security.checkRole(this.userId, ['technical', 'admin', 'manager']);
  Notes.update({ _id: id }, { $set: { important: true } });
}

function unmarkAsImportant(id) {
  check(id, String);
  Security.checkRole(this.userId, ['technical', 'admin', 'manager']);
  Notes.update({ _id: id }, { $set: { important: false } });
}

const notes = {
  insertNote
};

export default notes;

Meteor.methods({
  'notes.insert': function insertNoteMethod(note) {
    if (note.by === 'system') {
      return insertNote(note);
    }
    Security.checkIfAdmin(note.responsable?._id ? note.responsable?._id : Meteor.userId());
    return insertNote(note);
  },
  'notes.delete': deleteNote,
  'notes.markAsImportant': markAsImportant,
  'notes.unmarkAsImportant': unmarkAsImportant,
  'notes.getInvitationNotes': getInvitationNotes
});
