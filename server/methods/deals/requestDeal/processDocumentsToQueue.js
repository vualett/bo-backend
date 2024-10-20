import { Settings } from '../../../collections/settings';
import { queueProcessDISCLOSURE, queueProcessMCA } from '../../../queue/queue';
import format from 'date-fns/format';
import { $, multiply, divide } from 'moneysafe';
import { getMaxMonthlyPayment } from './utils';
import { getTermsInDays } from '../getDraftDeal';
import getPaymentDay from '../processDeal/getPaymentDay';
import { GetArrayPayments } from '../../../../server/utils/calculateInstallments';

export async function processDocuments({ request, dealCreated, user }) {
  const { amount, fee, numberOfPayments, termsOfPayment, base64Sign, signatures } = request;
  const { dealId, userId } = dealCreated;

  const weeklyIncomeByProduct = await Settings.findOne({
    _id: 'weeklyIncomeByProduct'
  });

  const weeklyTransfer = Math.round(((amount * (1 + fee)) / numberOfPayments) * 100) / 100;

  const _weeklyIncomeByProduct = weeklyIncomeByProduct || {
    300: 166.6,
    550: 416.6,
    700: 500,
    1000: 750,
    1500: 1000,
    2000: 1250,
    3000: 1500
  };

  const specifiedPercentage = Math.floor(
    multiply(divide($(weeklyTransfer), $(_weeklyIncomeByProduct[amount] || 700)), $(100))
      .add($(2))
      .valueOf()
  );

  const paymentDate = getPaymentDay(new Date(), user.paymentISODay);

  const paymentsDraft = GetArrayPayments({
    dealAmount: amount,
    numberOfPayments: numberOfPayments,
    feeAmount: amount * fee,
    paymentDate,
    isReadjusting: false
  });

  const feeAmount = paymentsDraft.reduce((acc, curr) => $(acc).add(curr.fee).valueOf(), 0);

  const documentsToProcess = [];

  const estimatedWeeklyIncome = _weeklyIncomeByProduct[amount] || 700;

  const generateDefaultProps = ({ sign }) => ({
    name: `${user.firstName} ${user.lastName}`,
    userId,
    industry: user.business.industry,
    email: `${user?.emails[0]?.address}`,
    address: `${user?.address?.street1}`,
    phone: `${user?.phone?.number}`,
    entityType: `${user?.business?.entityType}`,
    stateOfIncorporation: `${user?.address?.state}`,
    physicalAddress: `${user?.business?.physicalAddress}`,
    mailingAddress: `${user?.business?.mailingAddress}`,
    federalTaxpayerId: `${user?.business?.federalTaxpayerId}`,
    doingBusinessAs: `${user?.business?.doingBusinessAs}`,
    phoneBusiness: `${user?.business?.phone}`,
    mask: `${user?.bankAccount?.mask}`,
    dealId,
    date: format(new Date(), 'MM.dd.y'),
    purchasePrice: `${amount}`,
    weeklyTransfer: `${weeklyTransfer}`,
    specifiedPercentage: `${specifiedPercentage}`,
    averageVerifiedHistoricalRevenue: `${estimatedWeeklyIncome}`,
    base64Sign: sign
  });

  const generateMCAProps = ({ sign }) => ({
    ...generateDefaultProps({ sign }),
    amount: `${amount}`,
    language: user.language,
    specifiedAmount: `${$(amount)
      .add($(amount * fee))
      .toNumber()}`,
    designatedAccount: `${user?.bankAccount?.mask} - ${user?.bankAccount?.bankName}`
  });

  const monthTransfer = getMaxMonthlyPayment(paymentsDraft);
  const validAmountSold = $(amount)
    .add($(amount * fee))
    .toNumber();

  const generateDisclosureProps = ({ sign }) => ({
    ...generateDefaultProps({ sign }),
    state: user.address?.state,
    estimatedAnnualPercentage: `${Number(fee * 100).toFixed(2)}`,
    term: getTermsInDays({ numberOfPayments, termsOfPayment }),
    monthTransfer: `${monthTransfer}`,
    validAmountSold: `${validAmountSold}`,
    numberOfPayments: `${numberOfPayments}`,
    language: user.language,
    feeAmount: `${feeAmount}`,
    subWeeklyTransferMonth: `${monthTransfer - weeklyTransfer}`,
    subvalidAmountSoldPurchasePrice: `${validAmountSold - amount}`,
    estimatedAverageMonthlyIncome: `${estimatedWeeklyIncome * 4}`
  });

  if (base64Sign) {
    documentsToProcess.push({
      documentName: 'mca',
      sign: base64Sign,
      props: generateMCAProps({ sign: base64Sign })
    });
  } else if (Array.isArray(signatures)) {
    signatures.forEach((signature) => {
      if (signature.documentName === 'mcaSigned') {
        documentsToProcess.push({
          documentName: 'mca',
          sign: signature.base64Sign,
          props: generateMCAProps({ sign: signatures.base64Sign })
        });
      }

      if (signature.documentName === 'DisclosureSigned') {
        documentsToProcess.push({
          documentName: 'disclosure',
          sign: signature.base64Sign,
          props: generateDisclosureProps({ sign: signatures.base64Sign })
        });
      }
    });
  }

  documentsToProcess.forEach((document) => {
    if (document.documentName === 'mca') {
      queueProcessMCA({ ...document.props, base64Sign: document.sign });
    }

    if (document.documentName === 'disclosure') {
      queueProcessDISCLOSURE({ ...document.props, base64Sign: document.sign });
    }
  });
  return documentsToProcess;
}
