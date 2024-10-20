import { renderEmail, configStyleValidator } from 'react-html-email';
import paymentInitiated from './paymentInitiated.jsx';
import dealTransferProcessed from './dealTransferProcessed.jsx';
import paymentFailed from './paymentFailed.jsx';
import fundingSourceAdded from './fundingSourceAdded.jsx';
import fundingSourceRemoved from './fundingSourceRemoved.jsx';
import dealApproved from './dealApproved.jsx';
import customerCreated from './customerCreated.jsx';
import resetPassword from './resetPassword.jsx';
import dealApprovedAfterReevaluation from './dealApprovedAfterReevaluation.jsx';
import earlyRemittanceInitiated from './earlyRemittanceInitiated.jsx';

configStyleValidator({ warn: false });

const renderEmailTemplate = {
  resetPassword: ({ url }) => renderEmail(resetPassword(url)),
  customerCreated: ({ user, url }) => renderEmail(customerCreated(user, url)),
  paymentInitiated: ({ deal, user, payment }) => renderEmail(paymentInitiated({ deal, user, payment })),
  paymentFailed: ({ deal, user, payment }) => renderEmail(paymentFailed({ deal, user, payment })),
  dealTransferProcessed: ({ deal, user, set }) => renderEmail(dealTransferProcessed(user, deal, set)),
  fundingSourceAdded: ({ bankAccount }) => renderEmail(fundingSourceAdded(null, bankAccount)),
  fundingSourceRemoved: ({ bankAccount }) => renderEmail(fundingSourceRemoved(null, bankAccount)),
  cashAdvanceApproved: ({ user, deal }) => renderEmail(dealApproved(user, deal)),
  cashAdvanceApprovedAfterReevaluation: ({ user }) => renderEmail(dealApprovedAfterReevaluation(user)),
  earlyRemittanceInitiated: ({
    recipientName,
    advancedAmount,
    schedule,
    effectiveDate,
    signatureBase64,
    signatureURL
  }) =>
    renderEmail(
      earlyRemittanceInitiated({
        recipientName,
        advancedAmount,
        schedule,
        effectiveDate,
        signatureBase64,
        signatureURL
      })
    )
};

export default renderEmailTemplate;
