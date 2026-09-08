import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Read organization_id from either top-level field or data namespace
    const orgId = user.active_organization_id || user.organization_id ||
      user.data?.active_organization_id || user.data?.organization_id;

    if (!orgId) {
      return Response.json({ error: 'No organization linked', organization: null }, { status: 200 });
    }

    // Fetch via service role to bypass RLS (token may not resolve user.data fields)
    const sr = base44.asServiceRole;
    const org = await sr.entities.Organization.get(orgId);

    return Response.json({ organization: org || null });
  } catch (error) {
    console.error('getUserOrganization error:', error);
    return Response.json({ error: error.message, organization: null }, { status: 500 });
  }
}