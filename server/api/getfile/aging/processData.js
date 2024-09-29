import roundToTwo from '../../../utils/roundToTwo';

const getTotalAmountArray = (arr, operator) => roundToTwo(arr.map((e) => e[operator]).reduce((a, b) => a + b, 0));

export default function processData(data, includeDeals) {
  const mapped = data.map((g) => {
    const allOverduePayments = [];
    const allCurrentPayments = [];

    g.deals.forEach((d) => {
      allOverduePayments.push(...d.overduePayments);
      allCurrentPayments.push(...d.currentPayments);
    });

    // ALL
    const all = [...allOverduePayments, ...allCurrentPayments];
    const allTotalAmount = getTotalAmountArray(all, 'amount');
    const allPrincipalAmount = getTotalAmountArray(all, 'principal');
    const allFeeAmount = getTotalAmountArray(all, 'fee');

    // CURRENT
    const currentAmount = getTotalAmountArray(allCurrentPayments, 'amount');
    const currentPrincipalAmount = getTotalAmountArray(allCurrentPayments, 'principal');
    const currentFeeAmount = getTotalAmountArray(allCurrentPayments, 'fee');

    // IN ARREARS
    const allInArrearsAmount = getTotalAmountArray(allOverduePayments, 'amount');
    const allInArrearsPrincipalAmount = getTotalAmountArray(allOverduePayments, 'principal');
    const allInArrearsFeeAmount = getTotalAmountArray(allOverduePayments, 'fee');

    const oneWeek = allOverduePayments.filter((p) => p.weeksBehind === 0);
    const oneWeekAmount = getTotalAmountArray(oneWeek, 'amount');
    const oneWeekPrincipalAmount = getTotalAmountArray(oneWeek, 'principal');
    const oneWeekFeeAmount = getTotalAmountArray(oneWeek, 'fee');

    const twoWeek = allOverduePayments.filter((p) => p.weeksBehind === 1);
    const twoWeeksAmount = getTotalAmountArray(twoWeek, 'amount');
    const twoWeekPrincipalAmount = getTotalAmountArray(twoWeek, 'principal');
    const twoWeekFeeAmount = getTotalAmountArray(twoWeek, 'fee');

    const threeOrMoreWeek = allOverduePayments.filter((p) => p.weeksBehind >= 2);
    const threeOrMoreWeekAmount = getTotalAmountArray(threeOrMoreWeek, 'amount');
    const threeOrMoreWeekPrincipalAmount = getTotalAmountArray(threeOrMoreWeek, 'principal');
    const threeOrMoreWeekFeeAmount = getTotalAmountArray(threeOrMoreWeek, 'fee');

    const _deals = {
      count: g.deals.length,
      total: getTotalAmountArray(g.deals, 'amount'),
      deals: g.deals
    };
    return {
      month: g.group,
      deals: includeDeals ? _deals : null,

      current: {
        count: allCurrentPayments.length,
        totalAmount: currentAmount,
        totalPrincipalAmount: currentPrincipalAmount,
        totalFeeAmount: currentFeeAmount
      },
      allInArrears: {
        count: allOverduePayments.length,
        totalAmount: allInArrearsAmount,
        totalPrincipalAmount: allInArrearsPrincipalAmount,
        totalFeeAmount: allInArrearsFeeAmount
      },
      onePaymentsInArrears: {
        count: oneWeek.length,
        totalAmount: oneWeekAmount,
        totalPrincipalAmount: oneWeekPrincipalAmount,
        totalFeeAmount: oneWeekFeeAmount
      },
      twoPaymentsInArrears: {
        count: twoWeek.length,
        totalAmount: twoWeeksAmount,
        totalPrincipalAmount: twoWeekPrincipalAmount,
        totalFeeAmount: twoWeekFeeAmount
      },
      threeOrMorePaymentsInArrears: {
        count: threeOrMoreWeek.length,
        totalAmount: threeOrMoreWeekAmount,
        totalPrincipalAmount: threeOrMoreWeekPrincipalAmount,
        totalFeeAmount: threeOrMoreWeekFeeAmount
      }
    };
  });

  return mapped;
}
