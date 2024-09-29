import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Deals from '../../collections/deals';
import logger from '../../logger/log';
import Security from '../../utils/security';
Meteor.methods({
  '_metrics.dealsAggregate': async function dealsAggregate(pipeline) {
    check(pipeline, String);
    try {
      Security.checkRole(this.userId, ['technical', 'admin']);
      const parsed = JSON.parse(pipeline);

      const deals = await Deals.rawCollection().aggregate(parsed).toArray();

      return deals;
    } catch (error) {
      logger.error(`_metrics.dealsAggregate ${error}`);
      return error;
    }
  },

  '_metrics.exportDealsReport': async function dealsAggregate(pipeline) {
    check(pipeline, Object);

    try {
      Security.checkRole(this.userId, ['admin', 'riskProfile']);
      // const parsed = JSON.parse( pipeline);
      const deals = await Deals.rawCollection()
        .aggregate([{ $match: pipeline }])
        .toArray();

      return deals;
    } catch (error) {
      logger.log(`_metrics.exportDealsReport ${error}`);
      return error;
    }
  }
});
