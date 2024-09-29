import { Meteor } from 'meteor/meteor';
import Documents from '../../collections/documents';
import { check } from 'express-validator';
import Security from '../../../server/utils/security';
import { updateDocuments } from '../users/set/setConfigMethods';
import { STAGE, STATUS } from '../../consts/user';
import changeStatus from '../users/changeStatus';

Meteor.methods({
  deleteDocuments: async function (documentId: string) {
    check(documentId, String);
    Security.checkLoggedIn(Meteor.userId());
    Security.checkRole(Meteor.userId(), ['super-admin', 'admin', 'technical', 'validation']);

    try {
      const document = Documents.findOne(documentId);

      if (!document) {
        throw new Meteor.Error('DOCUMENT_NOT_FOUND');
      }

      Documents.remove(documentId);

      const user = Meteor.users.findOne({ _id: document.userId as string });

      if (!user) throw new Meteor.Error('USER_NOT_FOUND');

      if (user?.offStage?.stage === STAGE.UNDERWRITING.STAGE_5) {
        // set the document as not complete and enable the requirement
        updateDocuments(user._id, document.DocumentName, 'complete', false);
        Meteor.users.update(
          { _id: user._id },
          { $set: { 'requirements.$[elem].enable': true } },
          { arrayFilters: [{ 'elem.type': 'document', 'elem.complete': false }] }
        );
        Meteor.users.update(
          { _id: user._id, 'requirements.name': 'Argyle', 'requirements.complete': false },
          { $set: { 'requirements.$.enable': true, canSyncArgyle: true } }
        );
        //
        await changeStatus({ userId: user._id, status: STATUS.NEED_MORE_INFO, agentId: Meteor.userId() ?? undefined });
      }

      return true;
    } catch (error) {
      throw new Meteor.Error('Error', 'Error deleting the document.');
    }
  }
});
