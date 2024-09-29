import Deals from './collections/deals';
import Notes from './collections/notes';
import Logs from './collections/logs';
import Invitations from './collections/invitations';
import JobQueue from './collections/jobQueue';

export default function createIndexes() {
  JobQueue.rawCollection().createIndex({
    'data.dealId': 1,
    'data.paymentNumber': 1
  });
  Deals.rawCollection().createIndex({ userId: 1 });
  Notes.rawCollection().createIndex({ userId: 1 });
  Logs.rawCollection().createIndex({ userId: 1 });

  Invitations.rawCollection().createIndex({ by: 1 });
  Invitations.rawCollection().createIndex({ 'phone.number': 1 });
}
