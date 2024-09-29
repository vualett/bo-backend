import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import { TypeOfIssue } from '../tasks/overdue/createOrUpdateODTask';
import { queueCreateOverdueJiraTasks } from '../../../server/queue/queue';

export default async (dealID, paymentNumber, userId) => {
  const set = {
    'payments.$.status': 'declined',
    'payments.$.declinedAt': new Date(),
    'payments.$.NSFCheckDate': new Date(),
    'payments.$.returnCode': 'NSF'
  };

  Deals.update(
    {
      _id: dealID,
      'payments.number': paymentNumber
    },
    {
      $set: set
    }
  );

  queueCreateOverdueJiraTasks({
    dealID,
    paymentNumber,
    returnCode: 'NSF',
    typeOfIssue: TypeOfIssue.TASK
  });

  Meteor.users.update(
    { _id: userId },
    {
      $set: {
        canShare: false
      }
    }
  );
};
