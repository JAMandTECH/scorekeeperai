/**
 * Organization entitlement — the single source of truth for "does this
 * organization have paid access right now?".
 *
 * An organization is entitled while:
 *  - its subscription is active, or
 *  - its trial is still inside the 30-day window (a running trial grants the
 *    same access as an active subscription).
 *
 * Expired, cancelled, and past-trial organizations fall back to free tier.
 * The backend mirrors this rule in base44/shared/trialGuard.ts.
 */
export function isSubscriptionEntitled(organization) {
  if (!organization) return false;
  const status = organization.subscription_status || 'trial';
  if (status === 'active') return true;
  if (status !== 'trial') return false;
  if (!organization.trial_end_date) return true; // trial window not dated yet
  return new Date(organization.trial_end_date).getTime() > Date.now();
}

/** Whole days left in the trial, or null when the trial has no end date. */
export function getTrialDaysLeft(organization) {
  if (!organization?.trial_end_date) return null;
  const msLeft = new Date(organization.trial_end_date).getTime() - Date.now();
  if (!Number.isFinite(msLeft)) return null;
  return msLeft <= 0 ? 0 : Math.ceil(msLeft / 86400000);
}