export default function checkDealsWellPaid(deals, user) {
  if (!!deals && deals.length && deals.every((deal) => deal.metrics)) {
    const maxFailedPayments = user.category === 'a' ? 4 : 2;

    return deals.every((deal) => {
      const returnCodesArray =
        deal.metrics.returnCodes && deal.metrics.returnCodes.length
          ? deal.metrics.returnCodes
          : deal.payments.filter((p) => p.declinedAt).map((p) => p.returnCode);
      return (
        deal.metrics.failedPayments === 0 ||
        (deal.metrics.failedPayments <= maxFailedPayments && returnCodesArray.every((r) => r === 'R01'))
      );
    });
  } else {
    return false;
  }
}
