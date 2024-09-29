import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';
import Deals from '../../collections/deals';
import cancelTransfer from '../../dwolla/cancelTransfer';
import { Random } from 'meteor/random';


Meteor.methods({
    'deals.cancelDealTransfer': async function cancelDealTransfer(IDsArray: string[]) {
        Security.checkRole(Meteor.userId(), 'super-admin');

        const results = [];

        for (const id of IDsArray) {
            const Deal = Deals.findOne({ _id: id });
            if (Deal) {
                const { status, transferUrl } = Deal;

                if (status === 'approved' && transferUrl) {
                    const result = await cancelTransfer(transferUrl);
                    if (result) {
                        const newIdempotencyKey = Random.id();
                        Deals.update({ _id: id }, { $set: { status: 'requested', idempotencyKey: newIdempotencyKey } });
                        results.push(`Deal ${id} transfer cancelled, new idempotency key: ${newIdempotencyKey}`);
                    }
                }
            }
        }

        return results;
    }
});