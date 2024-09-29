import { Accounts } from 'meteor/accounts-base';
import renderEmailTemplate from '../emails/templates';
import { MAIL_FROM, MAIL_SMTP } from '../keys';

export default function accountsConfig() {
  process.env.MAIL_URL = MAIL_SMTP;

  Accounts.urls.resetPassword = (token) => `https://app.ualett.com/reset-password/${token}`;
  Accounts.urls.verifyEmail = (token) => `https://app.ualett.com/verify-email/${token}`;

  Accounts.emailTemplates.replyTo = 'support@ualett.com';
  Accounts.emailTemplates.siteName = 'ualett.com';
  Accounts.emailTemplates.from = MAIL_FROM;

  Accounts.emailTemplates.verifyEmail.subject = () => 'Please confirm your email.';
  Accounts.emailTemplates.verifyEmail.html = (user, url) => renderEmailTemplate.customerCreated({ user, url });

  Accounts.emailTemplates.resetPassword.subject = () => 'Reset your password';
  Accounts.emailTemplates.resetPassword.html = (user, url) => renderEmailTemplate.resetPassword({ url });

  Accounts.config({
    sendVerificationEmail: false,
    forbidClientAccountCreation: true,
    loginExpirationInDays: null
  });
}
