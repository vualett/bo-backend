import IDVStatusUpdated from '../api/webhooks/plaid/IDVStatusUpdated';
import Security from '../utils/security';

export default async function runIdentityVerificationCheck(idv_id) {
  check(idv_id, String);
  Security.checkRole(this.userId, ['technical']);

  return IDVStatusUpdated({ identity_verification_id: idv_id });
}
