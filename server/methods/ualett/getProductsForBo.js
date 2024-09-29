import { Meteor } from 'meteor/meteor';
import { Settings } from '../../collections/settings';
import Security from '../../utils/security';

async function getProducts(id) {
  Security.checkIfAdmin(Meteor.userId());
  const client = Meteor.users.findOne({ _id: id });

  const _Products = Settings.findOne({ _id: 'productsByCategories' });
  const states = Settings.findOne({ _id: 'statesCapAmount' });

  const result = _Products.products.map((item) => {
    const maxAmount = Math.max(...item.products.map((element) => element.amount));

    return {
      ...item,
      maxAmount
    };
  });

  let filterP = result;

  const user = Meteor.users.findOne({ _id: Meteor.userId() });

  const capAmount = user?.capAmount;

  const haveCapAmountState = states?.states?.filter((e) => e.abbreviaton === client?.address?.state);

  if (haveCapAmountState?.length >= 1) {
    filterP = result.filter((item) => item?.maxAmount <= haveCapAmountState[0]?.capAmount);
  } else if (capAmount && !isNaN(capAmount)) {
    if (capAmount <= 300) {
      filterP = result.filter((item) => item?.maxAmount <= capAmount);
    } else if (capAmount <= 550 && capAmount > 300) {
      filterP = result.filter((item) => item?.maxAmount <= capAmount);
    } else if (capAmount <= 700 && capAmount > 550) {
      filterP = result.filter((item) => item?.maxAmount <= capAmount);
    } else if (capAmount <= 1000 && capAmount > 700) {
      filterP = result.filter((item) => item?.maxAmount <= capAmount);
    } else if (capAmount <= 1500 && capAmount > 1000) {
      filterP = result.filter((item) => item?.maxAmount <= capAmount);
    } else if (capAmount <= 2000 && capAmount > 1500) {
      filterP = result.filter((item) => item?.maxAmount <= capAmount);
    } else if (capAmount <= 3000 && capAmount > 2000) {
      filterP = result.filter((item) => item?.maxAmount <= capAmount);
    } else if (capAmount <= 4000 && capAmount > 3000) {
      filterP = result.filter((item) => item?.maxAmount <= capAmount);
    } else if (capAmount <= 4000 && capAmount > 5000) {
      filterP = result.filter((item) => item?.maxAmount <= capAmount);
    }
  }

  return filterP;
}

Meteor.methods({ 'ualett.getProductsForBo': getProducts });
