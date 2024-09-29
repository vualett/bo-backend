import { Meteor } from 'meteor/meteor';
import Invitations from '../../collections/invitations';

interface Parameters {
  id: string;
  note: string;
  callbackDate: Date;
  isInvitation?: boolean;
}

export const updateUserToCallback = async ({
  id,
  note,
  callbackDate,
  isInvitation = true
}: Parameters): Promise<void> => {
  const collection = isInvitation ? Invitations : Meteor.users;

  await collection.updateAsync(
    { _id: id },
    {
      $set: {
        interaction: {
          timestamp: new Date(),
          by: { name: 'system' },
          status: 'callback',
          callbackDate,
          note
        }
      }
    }
  );
};
