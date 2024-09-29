/* eslint-disable camelcase */
import plaidClient from './plaid';
import logger from '../logger/log';
import { check } from 'meteor/check';
import Security from '../utils/security';
import insertLog from '../methods/logs/insertGenericLog';
import notifyUser from '../notifications/notifyUser';
import { NotifyChannel } from '../notifications/notifyChannel';

export default async function IdentityVerificationToSMS(idv_id) {
  check(idv_id, String);
  Security.checkRole(this.userId, ['technical', 'validation', 'riskProfile']);

  try {
    const request = {
      identity_verification_id: idv_id
    };
    const { status, data } = await plaidClient.identityVerificationGet(request);

    if (status !== 200) return;
    const { shareable_url, client_user_id } = data;
    if (!shareable_url || !client_user_id) throw new Error('NO URL OR USER ID');

    await notifyUser({
      body: `Complete your identity verification: ${shareable_url}. Ualett`,
      service: 'customerCare',
      userId: client_user_id,
      channel: NotifyChannel.SMS
    });

    insertLog(client_user_id, 'Identity verification link sent via Notification');

    return true;
  } catch (error) {
    logger.error(`plaid/IdentityVerificationToSMS [${idv_id}] ${error}`);
    throw error;
  }
}
