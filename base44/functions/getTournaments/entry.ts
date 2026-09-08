import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve organization_id from either top-level or data namespace
    // (JWT token may not resolve user.data fields for RLS)
    const orgId = user.active_organization_id || user.organization_id ||
      user.data?.active_organization_id || user.data?.organization_id;

    if (!orgId) {
      return Response.json({ tournaments: [] });
    }

    // Fetch via service role to bypass RLS
    const sr = base44.asServiceRole;
    const tournaments = await sr.entities.Tournament.filter({ organization_id: orgId }, '-created_date');

    return Response.json({ tournaments: tournaments || [] });
  } catch (error) {
    console.error('getTournaments error:', error);
    return Response.json({ error: error.message, tournaments: [] }, { status: 500 });
  }
}