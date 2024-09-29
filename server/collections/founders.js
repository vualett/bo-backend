import moment from 'moment';
import * as _ from 'lodash';

export const Founders = new Mongo.Collection('founders', {
  transform: (doc) => ({
    ...doc,
    nextContractEnds: () => doc.portfolio[0].endAt,
    deals: function () {
      let amount = 0;
      let count = 0;

      _.each(doc.portfolio, (d) => {
        _.each(d.deals, (deal) => {
          amount += deal.amount;
          ++count;
        });
      });

      return {
        count: count,
        amount: amount
      };
    },
    dealsCount: () => {
      let count = 0;
      _.each(doc.portfolio, (d) => {
        _.each(d.deals, (deal) => {
          ++count;
        });
      });
      return count;
    },
    totalInitialFunds: () => {
      let amount = 0;

      _.each(doc.portfolio, (d) => {
        amount += d.initial_funds;
      });

      return amount;
    },
    totalFundsAvailable: () => {
      let amount = 0;

      _.each(doc.portfolio, (d) => {
        amount += d.available_funds;
      });

      return amount;
    }
  })
});

if (Meteor.isServer) {
  Meteor.publish('founders', function () {
    return Founders.find();
  });
}

Founders.before.insert(function (userId, doc) {
  let contractTime = doc.portfolio[0].contract_type;
  if (contractTime) {
    doc.portfolio[0].endAt = new Date(moment().endOf('day').add(contractTime, 'M').format());
  }
  doc.portfolio[0].createdAt = new Date();
  doc.createdAt = new Date();
});
