import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized', organizations: [] }, { status: 401 });

    const sr = base44.asServiceRole;

    // 1. List this user's org memberships (service-role bypasses RLS)
    const memberships = await sr.entities.UserOrganization.filter({
      user_id: user.id
    });

    // 2. Collect candidate org IDs: memberships + primary + active
    const orgIds = new Set<string>();
    memberships.forEach((m: any) => { if (m.organization_id) orgIds.add(m.organization_id); });
    if (user.organization_id) orgIds.add(user.organization_id);
    if (user.active_organization_id) orgIds.add(user.active_organization_id);
    if (user.data?.organization_id) orgIds.add(user.data.organization_id);
    if (user.data?.active_organization_id) orgIds.add(user.data.active_organization_id);

    // 3. Fetch each org via service role (bypasses Organization read RLS)
    const organizations: any[] = [];
    for (const id of orgIds) {
      try {
        const org = await sr.entities.Organization.get(id);
        if (org) organizations.push(org);
      } catch (err) {
        console.error(`getUserOrganizations: failed to fetch org ${id}`, err);
      }
    }

    return Response.json({ organizations, memberships });
  } catch (error) {
    console.error('getUserOrganizations error:', error);
    return Response.json({ error: error.message, organizations: [], memberships: [] }, { status: 500 });
  }
}