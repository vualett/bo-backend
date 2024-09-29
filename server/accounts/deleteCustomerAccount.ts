import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { truncateEmail, truncatePhoneNumber } from './utils';
import { JOB_NAME } from '../queue/jobs/deleteCustomerAccountJob';
import Security from '../utils/security';
import Queue from '../queue/queue';
import { insertDataChangesLog } from '../dataChangesLogs';

import Invitations from '../collections/invitations';
import Notes from '../collections/notes';

export default async function deleteCustomerAccount(userId: string): Promise<void> | never {
  check(userId, String);

  const user = await Meteor.users.findOneAsync({ _id: userId });

  if (user === undefined) throw new Meteor.Error('Not found user');

  if (user.isAdmin ?? false) throw new Meteor.Error('Not a customer account');

  const userModified: Mongo.Modifier<Meteor.User> = {
    $unset: { services: '' },
    $set: {
      firstName: user.firstName[0],
      lastName: user.lastName[0],
      emails: user.emails
        ?.slice(0, 1)
        .map(({ address, ...email }: { address: string; [key: string]: any }) => ({
          ...email,
          truncateAddress: truncateEmail(address)
        })),
      phone: { number: truncatePhoneNumber(user.phone.number) },
      dwollaCustomerURL: user.dwollaCustomerURL,
      plaidAccessToken: user.plaidAccessToken,
      address: { state: user.address.state },
      createdAt: user.createdAt,
      invitedBy: user.invitedBy,
      status: {
        lastLogin: user.status.lastLogin
      },
      metrics: {
        cashAdvances: user.metrics.cashAdvances
      },
      deletedAt: new Date()
    }
  };

  await Meteor.users.updateAsync({ _id: userId }, userModified);

  const invitation = await Invitations.findOneAsync({
    phone: {
      $elemMatch: {
        number: user.phone.number
      }
    }
  });

  if (!invitation) throw new Meteor.Error('INVITATION_NOT_FOUND');

  await Notes.removeAsync({ invitationId: invitation._id });
}

async function cancelDeleteCustomerAccount(userId: string): Promise<void> | never {
  const createdBy = Meteor.userId();
  if (
    !(
      Boolean(Security.hasRole(createdBy, ['technical', 'super-admin', 'validation'])) ||
      Boolean(Security.hasAccess(createdBy, ['CancelDeleteAccount']))
    )
  )
    return;

  check(userId, String);

  await Meteor.users.updateAsync(
    { _id: userId, deleteRequest: { $exists: true } },
    { $unset: { deleteRequest: '', disabled: '' } }
  );

  await Queue.cancel({
    name: JOB_NAME,
    data: userId
  });
}

async function deleteCustomerForDuplicateAccount(userId: string): Promise<void> | never {
  const createdBy = Meteor.userId();
  if (
    !(
      Boolean(Security.hasRole(createdBy, ['technical', 'riskProfile'])) ||
      Boolean(Security.hasAccess(createdBy, ['deleteDuplicateAccount']))
    )
  )
    return;

  check(userId, String);

  insertDataChangesLog({
    where: 'users',
    documentID: userId,
    operation: 'update',
    method: 'deleteCustomerForDuplicateAccount',
    createdAt: new Date(),
    createdBy,
    old_data: await Meteor.users.findOneAsync({ _id: userId }),
    new_data: {}
  });

  await deleteCustomerAccount(userId);
}

Meteor.methods({
  deleteCustomerAccount,
  cancelDeleteCustomerAccount,
  deleteCustomerForDuplicateAccount
});
