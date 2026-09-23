import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized', organizations: [] }, { status: 401 });

    // Service-role bypasses Organization read RLS so all active orgs are visible for joining
    const organizations = await base44.asServiceRole.entities.Organization.filter({
      status: 'active'
    });

    return Response.json({ organizations });
  } catch (error) {
    console.error('getAllOrganizations error:', error);
    return Response.json({ error: error.message, organizations: [] }, { status: 500 });
  }
}