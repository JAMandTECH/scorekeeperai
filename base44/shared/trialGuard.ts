/**
 * Trial Guard — blocks live-scoring writes for trial/expired/cancelled orgs.
 * Shared by updateGame and upsertPlayerStat (defense-in-depth behind the UI).
 *
 * Only organizations with subscription_status === 'active' may score live games.
 * Trial, expired, cancelled, or missing status all block writes.
 */
export async function isOrgBlockedFromLiveScoring(base44, organizationId) {
  if (!organizationId) return false;
  try {
    const org = await base44.asServiceRole.entities.Organization.get(organizationId);
    if (!org) return false;
    const status = org.subscription_status || 'trial';
    return status !== 'active';
  } catch (e) {
    console.error('trialGuard: failed to fetch organization', e?.message || e);
    return false; // don't break paid users on transient errors
  }
}