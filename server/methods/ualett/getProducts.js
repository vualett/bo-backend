import { Meteor } from 'meteor/meteor';
import { Settings } from '../../collections/settings';
import Security from '../../utils/security';

function getProducts() {
  Security.checkIfAdmin(this.userId);
  const _Products = Settings.findOne({ _id: 'productsByCategories' });

  let result = _Products.products.map((item) => {
    const maxAmount = Math.max(...item.products.map((element) => element.amount));
    return {
      ...item,
      maxAmount
    };
  });
  let filterP = result;

  const user = Meteor.users.findOne({ _id: this.userId });

  const capAmount = user?.capAmount;

  if (capAmount && !isNaN(capAmount)) {
    if (capAmount <= 300) {
      filterP = result.filter((item) => item.maxAmount <= capAmount);
    } else if (capAmount <= 550 && capAmount > 300) {
      filterP = result.filter((item) => item.maxAmount <= capAmount);
    } else if (capAmount <= 700 && capAmount > 550) {
      filterP = result.filter((item) => item.maxAmount <= capAmount);
    } else if (capAmount <= 1000 && capAmount > 700) {
      filterP = result.filter((item) => item.maxAmount <= capAmount);
    } else if (capAmount <= 1500 && capAmount > 1000) {
      filterP = result.filter((item) => item.maxAmount <= capAmount);
    } else if (capAmount <= 2000 && capAmount > 1500) {
      filterP = result.filter((item) => item.maxAmount <= capAmount);
    } else if (capAmount <= 3000 && capAmount > 2000) {
      filterP = result.filter((item) => item.maxAmount <= capAmount);
    }
  }

  return filterP;
}

Meteor.methods({ 'ualett.getProducts': getProducts });
