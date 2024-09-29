// Deals / Hooks
import Deals from '../collections/deals';

// Before Deal Update
Deals.before.update((userId, doc, fieldNames, modifier, options) => {
  modifier.$set = modifier.$set || {};
  modifier.$set.modifiedAt = new Date();
});
