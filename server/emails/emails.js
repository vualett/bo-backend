import { GetObjectCommand } from '@aws-sdk/client-s3';
import * as Sentry from '@sentry/node';
import logger from '../logger/log';
import renderEmailTemplate from './templates';
import { s3 } from '../aws/services';
import capitalize from '../utils/capitalize';
import { AWS_BUCKET_NAME, TRUSTPILOT_AUTOMATIC_INVITE_BCC, AWS_SIGNATURES_BUCKET_NAME } from '../keys';
import { queueSendEmail } from '../queue/queue';
import { uploadSignature } from '../api/documents/methods/uploadAdvanceRemittanceSignature';
import format from 'date-fns/format';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const convertBase64ToBuffer = (base64Data) => {
  const base64Image = base64Data.split(';base64,').pop();
  return Buffer.from(base64Image, 'base64');
};

export const sendFundingSourceAdded = (user, bankAccount) => {
  const verifiedEmail = user.emails.find((e) => e.verified);
  if (!verifiedEmail) return;

  const emailToSent = {
    to: verifiedEmail.address,
    subject: 'Bank account added',
    html: renderEmailTemplate.fundingSourceAdded({ bankAccount }),
    userId: user._id
  };

  queueSendEmail(emailToSent);
};

export const sendFundingSourceRemoved = (user, bankAccount) => {
  const verifiedEmail = user.emails.find((e) => e.verified);
  if (!verifiedEmail) return;

  const emailToSent = {
    to: verifiedEmail.address,
    subject: 'Bank account removed',
    html: renderEmailTemplate.fundingSourceRemoved({ bankAccount }),
    userId: user._id
  };

  queueSendEmail(emailToSent);
};

export const sendRemittanceEmailWithAttachment = async (user, remittanceDetails, signatureBase64) => {
  const verifiedEmail = user.emails.find((e) => e.verified);
  if (!verifiedEmail) return;

  const { recipientName, weeklyAmount, schedule, effectiveDate } = remittanceDetails;
  const advancedAmount = weeklyAmount;
  const formattedEffectiveDate = new Date(effectiveDate).toLocaleDateString();

  const signatureBuffer = convertBase64ToBuffer(signatureBase64);

  const fileName = `${user._id}/remittance_schedule_${format(new Date(), 'MMMM-dd-yyyy hh:mm:ss')}.png`;

  await uploadSignature(signatureBuffer, user._id, fileName, 'image/png');

  const params = {
    Bucket: AWS_SIGNATURES_BUCKET_NAME,
    Key: fileName
  };

  const command = new GetObjectCommand(params);

  const signatureURL = await getSignedUrl(s3, command, { expiresIn: 3600 });

  const htmlContent = renderEmailTemplate.earlyRemittanceInitiated({
    user,
    recipientName,
    advancedAmount,
    schedule,
    effectiveDate: formattedEffectiveDate,
    signatureBase64,
    signatureURL
  });

  const emailToSend = {
    to: `${capitalize(user.firstName)} <${verifiedEmail.address}>`,
    subject: 'Remittance Schedule Update',
    html: htmlContent,
    userId: user._id
  };

  queueSendEmail(emailToSend);
};

export const sendDealApprovedEmail = async (user, deal, set, docId) => {
  try {
    const verifiedEmail = user.emails.find((e) => e.verified);

    const sendTrustPilotFeedback = deal.firstDeal;

    if (!verifiedEmail) return;

    if (docId) {
      const params = {
        Bucket: AWS_BUCKET_NAME,
        Key: `${docId}.pdf`
      };

      const command = new GetObjectCommand(params);

      const response = await s3.send(command);

      const emailToSent = {
        to: `${capitalize(user.firstName)} <${verifiedEmail.address}>`,
        subject: 'Cash advance approved',
        html: renderEmailTemplate.cashAdvanceApproved({ user, deal, set }),
        attachments: [
          {
            filename: 'mca.pdf',
            content: response.Body,
            contentType: 'application/pdf'
          }
        ],
        userId: user._id
      };

      if (TRUSTPILOT_AUTOMATIC_INVITE_BCC && sendTrustPilotFeedback) {
        emailToSent.bcc = TRUSTPILOT_AUTOMATIC_INVITE_BCC;
      }

      queueSendEmail(emailToSent);
    } else {
      const emailToSent = {
        to: verifiedEmail.address,
        subject: 'Cash advance approved',
        html: renderEmailTemplate.cashAdvanceApproved({ user, deal, set }),
        userId: user._id
      };

      if (TRUSTPILOT_AUTOMATIC_INVITE_BCC && sendTrustPilotFeedback) {
        emailToSent.bcc = TRUSTPILOT_AUTOMATIC_INVITE_BCC;
      }

      queueSendEmail(emailToSent);
    }
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`"[sendDealApprovedEmail] ${error}`);
  }
};

export const sendDealTransferProcessedEmail = (user, deal, set) => {
  const verifiedEmail = user.emails.find((e) => e.verified);
  if (!verifiedEmail) return;

  const emailToSent = {
    to: verifiedEmail.address,
    subject: 'Cash advance processed',
    html: renderEmailTemplate.dealTransferProcessed({ user, deal, set }),
    userId: user._id
  };

  queueSendEmail(emailToSent);
};

export const sendInitiatedPaymentEmail = (user, payment) => {
  if (!user) return;
  if (!payment) return;

  const verifiedEmail = user.emails.find((e) => e.verified);
  if (!verifiedEmail) return;

  const emailToSent = {
    to: verifiedEmail.address,
    subject: 'Your cash advance payment is being processed.',
    html: renderEmailTemplate.paymentInitiated({ user, payment }),
    userId: user._id
  };

  queueSendEmail(emailToSent);
};

export const sendDealApprovedEmailAfterReevaluation = async (user) => {
  const verifiedEmail = user?.emails?.find((e) => e.verified);
  if (!verifiedEmail) return;

  const emailToSent = {
    to: verifiedEmail.address,
    userId: user._id,
    subject: 'Great News! Your Cash Advance Request Has Been Approved',
    html: renderEmailTemplate.cashAdvanceApprovedAfterReevaluation({ user })
  };

  await queueSendEmail(emailToSent);
};
