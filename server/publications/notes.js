import { Meteor } from 'meteor/meteor';
import Notes from '../collections/notes';

Meteor.publish({
  userNotes(id, limit) {
    return Notes.find({ userId: id, where: 'user' }, { limit, sort: { createdAt: -1 } });
  },
  userFilteredNotes({ userId, personalSwitch, statusSwitch }, limit) {
    let type = [];
    let ntype = [];
    if (statusSwitch) {
      type.push('status');
    } else {
      ntype.push('status');
    }

    return Notes.find(
      {
        userId,
        where: 'user',
        ...(!personalSwitch ? { type: { $in: type } } : { type: { $nin: ntype } })
      },
      { limit, sort: { createdAt: -1 } }
    );
  }
});
