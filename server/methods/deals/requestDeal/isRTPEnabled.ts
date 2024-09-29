import { Meteor } from 'meteor/meteor';
import getFundingSource from '../../../dwolla/getFundingSource';

interface IFundingSource {
    channels: string[];
}

export default async function isRTPEnabled(User: Meteor.User): Promise<boolean> {
    const { _id, metrics, dwollaFundingURL } = User;

    if (!dwollaFundingURL) return false;

    const fundingSource: IFundingSource = await getFundingSource(dwollaFundingURL);

    if (!fundingSource?.channels) return false;

    Meteor.users.update({ _id }, { $set: { 'bankAccount.channels': fundingSource.channels } });

    if (fundingSource.channels.includes('real-time-payments')) {
        if (metrics.cashAdvances.count > 0) return true;
    }
    return false;
}