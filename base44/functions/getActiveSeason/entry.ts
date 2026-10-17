import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthorizedOrg } from '../../shared/orgAuth.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { orgId, error } = resolveAuthorizedOrg(user, body.organization_id);
    if (error) return error;
    if (!orgId) return Response.json({ season: null });

    const seasons = await base44.asServiceRole.entities.Season.filter({
      organization_id: orgId, status: 'active',
    });
    return Response.json({ season: seasons?.[0] || null });
  } catch (error) {
    console.error('getActiveSeason error', error);
    return Response.json({ error: error.message, season: null }, { status: 500 });
  }
}