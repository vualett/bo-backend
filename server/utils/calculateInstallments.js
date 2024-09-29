import { $ } from 'moneysafe';
import { addWeeks } from 'date-fns';
import { Random } from 'meteor/random';

export function GetInstallments(total, installments) {
  const pennies = total * 100;
  const remainder = pennies % installments;
  const otherPayments = (pennies - remainder) / installments;
  const firstPayment = otherPayments + remainder;

  const results = [];

  for (let i = 0; i < installments; i += 1) {
    if (i === 0) {
      results.push(firstPayment / 100);
    } else {
      results.push(otherPayments / 100);
    }
  }
  return results;
}

export function CalculateAmountAvg(numberOfPayments, principals, totalFee) {
  const feePerAmount = totalFee / numberOfPayments;

  const principalPlusFeePerAmount = principals.map((amount) => {
    return $(amount).add(feePerAmount).valueOf();
  });

  const totalAmount = principalPlusFeePerAmount.reduce((a, b) => $(a).add(b).valueOf(), 0);

  const principalAvg = Number((totalAmount / numberOfPayments).toFixed(2));

  return principalAvg;
}

export function GetArrayPayments({
  dealAmount,
  numberOfPayments,
  feeAmount,
  paymentDate,
  isReadjusting,
  firstDate,
  isBiweekly
}) {
  const principalInstallments = GetInstallments(dealAmount, numberOfPayments);

  const principalInstallmentsAvg = CalculateAmountAvg(numberOfPayments, principalInstallments, feeAmount);

  const arrayPayments = [];

  if (!isReadjusting) {
    for (let i = 0; i < numberOfPayments; i += 1) {
      const newFeePerPayment = $(principalInstallmentsAvg).minus(principalInstallments[i]).valueOf();

      const payment = {
        status: 'schedule',
        number: i + 1,
        date: addWeeks(paymentDate, i),
        amount: $(principalInstallments[i]).add(newFeePerPayment).valueOf(),
        principal: principalInstallments[i],
        fee: newFeePerPayment,
        idempotencyKey: Random.id(),
        attempts: 0
      };
      arrayPayments.push(payment);
    }
  } else {
    for (let i = 0; i < numberOfPayments; i += 1) {
      const feeInstallments = GetInstallments(feeAmount, numberOfPayments);
      const payment = {
        status: 'schedule',
        number: 0,
        date: addWeeks(firstDate, isBiweekly ? i * 2 : i),
        amount: $(principalInstallments[i]).add(feeInstallments[i]).valueOf(),
        principal: principalInstallments[i],
        fee: $(feeInstallments[i]).valueOf(),
        idempotencyKey: Random.id(),
        bonus: 0
      };
      arrayPayments.push(payment);
    }
  }

  return arrayPayments;
}
