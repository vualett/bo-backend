import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import { Backups } from '../../collections/backups';
import Security from '../../utils/security';
import { Settings } from '../../collections/settings';
import madePayment from './madePayment';
import { lt, $, gt } from 'moneysafe';

const emptyProduct = {
  category: 'none',
  products: [
    {
      amount: 0,
      options: [
        {
          name: '1 Weeks',
          numberOfPayments: 10,
          termsOfPayment: 'weekly',
          fees: [0]
        }
      ]
    }
  ]
};

const availableProducts = async (userId) => {
  const USERID = userId || Meteor.userId();

  const user = await Meteor.users.findOne({ _id: USERID });

  if (!user.status.verified) return false;

  let userFeeLevel = 0;

  if (user.metrics && user.metrics.cashAdvances) {
    const { count } = user.metrics.cashAdvances;
    if (count >= 1) userFeeLevel = 1;
  }

  const _Products = await Settings.findOne({ _id: 'productsByCategories' });
  const _feeDiscount = await Settings.findOne({ _id: 'feeDiscount' });
  const addFeeDiscount =
    !!_feeDiscount?.value &&
    $(1).minus(_feeDiscount.value).valueOf() &&
    gt($($(1).minus(_feeDiscount.value).valueOf()), $(0)) &&
    lt($($(1).minus(_feeDiscount.value).valueOf()), $(1));

  // TEMP: CATEGORY OVERRIDE
  const USER_CATEGORY = (() => {
    if (user.category.slice(-1) === '!') return user.category.slice(0, -1);
    return user.category;
  })();

  const Products =
    ['none', 'suspended'].includes(user.category.toLowerCase())
      ? emptyProduct
      : _Products.products.find((e) => e.category === USER_CATEGORY);

  if (!Products) return false;

  // returns products with lowest amount of the current
  const maxAmount = Math.max(...Products.products.map((pp) => pp.amount));
  const elegibleProducts = _Products.products.filter((p) => {
    let isLessThan = true;
    p.products.forEach((pp) => {
      if (pp.amount > maxAmount) {
        isLessThan = false;
      }
    });
    return isLessThan;
  });

  // filter products setting fees and payments
  const filteredProducts = [];
  elegibleProducts.forEach((ep) => {
    const toSent = ep.products.map((pp) => {
      const options = pp.options.map((o) => {
        let fee = o.fees[userFeeLevel] || o.fees[0];

        // discount fee
        if (addFeeDiscount) {
          fee *= $(1).minus(_feeDiscount.value).valueOf();
        }
        const amountToPay = (pp.amount * (1 + fee)) / o.numberOfPayments;

        const payment = Math.round(amountToPay * 100) / 100;

        return { ...o, fee, payment };
      });

      return { ...pp, options, userFeeLevel };
    });

    filteredProducts.push(...toSent);
  });

  // remove duplicates
  const uniqueAmountMap = new Map();
  filteredProducts.forEach(item => {
    if (!uniqueAmountMap.has(item.amount)) {
      uniqueAmountMap.set(item.amount, item);
    }
  });

  // returns products with amount > 0 and sorted by amount
  const elegibleProductsToSent = Array.from(uniqueAmountMap.values())
    .filter(ep => ep.amount > 0)
    .sort((a, b) => a.amount - b.amount);

  return elegibleProductsToSent;
};

export function deleteDeal(id) {
  Security.checkRole(Meteor.userId(), 'super-admin');
  const cancelledAt = new Date();

  const updated = Deals.update(
    {
      _id: id
    },
    {
      $set: {
        state: 'cancelled',
        cancelledAt,
        lastModified: new Date()
      }
    }
  );

  if (updated) {
    const deal = Deals.findOne({ _id: id });

    deal.type = 'deal';
    deal.old_id = deal._id;
    delete deal._id;

    if (Backups.insert(deal)) {
      Deals.remove({
        _id: id
      });
    }

    Meteor.users.update(
      { _id: deal.userId },
      {
        $set: {
          'currentCashAdvance.status': 'cancelled',
          'currentCashAdvance.cancelledAt': cancelledAt
        }
      }
    );
  }
  return updated;
}

const dealsMethods = {
  availableProducts,
  'deals.delete': deleteDeal,
  'deals.madePayment': function madePaymentMethod(id, paymentNumber, transferUrl) {
    Security.checkIfAdmin(Meteor.userId());
    return madePayment(id, paymentNumber, transferUrl, Meteor.userId());
  }
};

export default dealsMethods;
Meteor.methods(dealsMethods);
