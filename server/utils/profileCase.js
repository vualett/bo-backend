import Security from './security';
import { ROLES } from '../consts/roles';

export default function profileCase(userId) {
  return Security.hasExplicitRole(userId, 'manager')
    ? Security.hasExplicitRole(userId, 'repetition')
      ? 'repetitionManager'
      : Security.hasExplicitRole(userId, ROLES.ONBOARDING)
        ? 'onboardingManager'
        : Security.hasExplicitRole(userId, ROLES.SALES)
          ? 'salesManager' : null
    : Security.hasExplicitRole(userId, 'repetition')
      ? 'repetition'
      : Security.hasExplicitRole(userId, ROLES.ONBOARDING)
        ? ROLES.ONBOARDING
        : Security.hasExplicitRole(userId, ROLES.SALES)
          ? ROLES.SALES
          : Security.hasExplicitRole(userId, 'validation')
            ? Security.hasAccess(userId, 'validate')
              ? 'validate'
              : Security.hasAccess(userId, 'escalate')
                ? 'escalate'
                : Security.hasAccess(userId, 'reactivate')
                  ? 'reactivate'
                  : null
            : null;
}
