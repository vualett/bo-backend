import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Deals from '../../collections/deals';
import { capitalizeFirstLetterOfEachWord } from '../../utils/utils';

export default function updateDealInteractionStatus({ userId, dealId, status, callbackDate, note, responsable }) {
  check(userId, String);
  check(dealId, String);
  check(status, String);

  const by = responsable?._id
    ? {
        name: capitalizeFirstLetterOfEachWord(responsable.firstName),
        id: responsable._id
      }
    : { name: 'system' };

  Deals.update(
    { _id: dealId },
    {
      $set: {
        interaction: {
          timestamp: new Date(),
          by,
          status,
          callbackDate,
          note: status.toUpperCase() + (note ? ': ' + note : '')
        }
      }
    },
    (err, data) => {
      if (err) {
        throw new Meteor.Error(err);
      }
    }
  );
}
