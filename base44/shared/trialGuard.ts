/**
 * Trial Guard — blocks live-scoring writes for organizations without paid
 * access. Shared by updateGame, manageLineup, and upsertPlayerStat
 * (defense-in-depth behind the UI).
 *
 * Mirrors src/lib/subscriptionAccess.js: an active subscription and a trial
 * still inside its 30-day window both unlock live scoring. Expired, cancelled,
 * and past-trial organizations are blocked.
 */
export async function isOrgBlockedFromLiveScoring(base44, organizationId) {
  if (!organizationId) return false;
  try {
    const org = await base44.asServiceRole.entities.Organization.get(organizationId);
    if (!org) return false;
    const status = org.subscription_status || 'trial';
    if (status === 'active') return false;
    if (status !== 'trial') return true;
    if (!org.trial_end_date) return false; // trial window not dated yet
    return new Date(org.trial_end_date).getTime() <= Date.now();
  } catch (e) {
    console.error('trialGuard: failed to fetch organization', e?.message || e);
    return false; // don't break paying users on transient errors
  }
}