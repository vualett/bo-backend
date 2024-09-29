export default function shouldClearStatus(user) {
  const { status } = user;

  if (status.unqualifiedReason === 'does not meet the requirements') return true;
  if (status.unqualifiedReason === 'not interested') return true;

  return false;
}
