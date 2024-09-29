import { Meteor } from 'meteor/meteor';
import logger from '../logger/log';
import { subDays, startOfDay } from 'date-fns';
import { TransferLogs } from '../logs/transferLogs';
import Security from '../utils/security';

const TransferLogsCollection = TransferLogs.rawCollection();

const pipeline = [
  { $match: { status: { $in: ['processed', 'failed'] } } },
  { $project: { _id: 0 } },
  {
    $group: { _id: '$id', transfers: { $push: '$$ROOT' } }
  },
  {
    $project: {
      hasFailed: {
        $in: ['failed', '$transfers.status']
      },
      failed: {
        $arrayElemAt: [
          {
            $filter: {
              input: '$transfers',
              as: 'transfer',
              cond: { $in: ['$$transfer.status', ['failed']] }
            }
          },
          0
        ]
      },
      processed: {
        $arrayElemAt: [
          {
            $filter: {
              input: '$transfers',
              as: 'transfer',
              cond: { $in: ['$$transfer.status', ['processed']] }
            }
          },
          0
        ]
      }
    }
  }
];

export default {};

export async function getTransferLogs() {
  const results = await TransferLogsCollection.aggregate(pipeline, {
    allowDiskUse: true
  }).toArray();

  const mapped = results.map((e) => {
    if (e.hasFailed) return { ...e.failed, previouslyProcessed: !!e.processed };
    return e.processed;
  });

  const filtered = mapped.filter((t) => new Date(t.created) >= subDays(startOfDay(new Date()), 60));

  return filtered;
}

Meteor.methods({
  'TransferLogs.get': async () => {
    Security.checkIfAdmin(Meteor.userId());
    try {
      const results = await getTransferLogs();
      return results;
    } catch (error) {
      logger.error(`[TransferLogs.get] ${JSON.stringify(error)}`);
      throw error;
    }
  }
});
