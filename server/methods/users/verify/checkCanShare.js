// Check if client made first payment
function hasFirstPayment(deal, user) {
  const paymentsArr = deal.payments;
  let paidFirstDeal = false;

  if (deal.firstDeal === true && paymentsArr[0].status === 'paid') {
    paidFirstDeal = true;
  } else if (user.metrics.cashAdvances.count > 1) {
    paidFirstDeal = true;
  }

  return paidFirstDeal;
}

// Checks if cx has declined payment
function hasDeclinedPayments(deal) {
  const paymentsArr = deal.payments;
  let hasDeclined = false;

  paymentsArr.forEach((e) => {
    if (e.status === 'declined') {
      hasDeclined = true;
    }
  });

  return hasDeclined;
}

export function checkCanShare(deal, user) {
  return !hasDeclinedPayments(deal) && hasFirstPayment(deal, user);
}
