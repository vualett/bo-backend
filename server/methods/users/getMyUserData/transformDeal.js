export default (deal) => {
  const newDeal = deal;

  function paid() {
    const paid = {
      count: 0,
      capital: 0,
      fees: 0,
      total: 0,
      complete: 0.0
    };
    const payments = [];

    deal.payments.forEach((o) => {
      if (o.status === 'paid' || o.status === 'partial') payments.push(o);
    });

    payments.forEach((e, i) => {
      paid.amount += e.paid;
    });

    paid.count = payments.length;
    paid.complete = (paid.capital / deal.amount) * 100;

    // Ajustar precision;
    paid.capital = Number(parseFloat(paid.capital).toFixed(2));
    paid.complete = Number(parseFloat(paid.complete).toFixed(1));

    return paid;
  }

  function nextPayment() {
    const scheduledPayments = deal.payments
      .filter((p) => p.status === 'schedule')
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    return scheduledPayments[0];
  }

  function hasDeclinedPayment() {
    return deal.payments.map((p) => p.status).includes('declined');
  }

  newDeal.paid = paid();
  newDeal.nextPayment = nextPayment();
  newDeal.hasDeclinedPayment = hasDeclinedPayment();
  return newDeal;
};
