/* eslint-disable @typescript-eslint/naming-convention */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { DataChangesLogs } from './collections/dataChangesLogs';

export function insertDataChangesLog(params: Meteor.DataChangesLog): void {

  const { where, documentID, operation, method, createdBy, old_data, new_data } = params;

  check(where, String);
  check(operation, String);
  check(createdBy, String);
  check(documentID, String);

  const log: Mongo.OptionalId<Meteor.DataChangesLog> = {
    where,
    documentID,
    operation,
    method,
    createdBy,
    old_data: old_data ?? false,
    new_data: new_data ?? false,
    createdAt: new Date()
  };

  DataChangesLogs.insert(log);
}

export default DataChangesLogs;
