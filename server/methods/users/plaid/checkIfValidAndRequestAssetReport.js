import { Meteor } from 'meteor/meteor';
import createAssetReport from './createAssetReport';

import compareAsc from 'date-fns/compareAsc';
import differenceInYears from 'date-fns/differenceInYears';

import * as Sentry from '@sentry/node';
import markItemLoginRequired from '../../../plaid/markItemLoginRequired';
export default async function checkIfValidAndRequestAssetReport(userId) {
  const user = Meteor.users.findOne({ _id: userId });
  try {
    if (user.plaidAssetReport && user.plaidAssetReport.length) {
      const latestAssetReport = user.plaidAssetReport
        .filter((item) => item.inDB)
        .sort((a, b) => compareAsc(b.requestedAt, a.requestedAt));
      if (latestAssetReport.length && differenceInYears(new Date(), latestAssetReport[0].requestedAt)) {
        await createAssetReport(userId, false, true);
      }
    } else {
      await createAssetReport(userId, false, true);
    }
  } catch (error) {
    Sentry.captureException(error);
    markItemLoginRequired(userId, error);
  }
}
