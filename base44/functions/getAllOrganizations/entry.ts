import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized', organizations: [] }, { status: 401 });

    // Service-role bypasses Organization read RLS so all active orgs are visible for joining.
    // Return only minimal public fields — never expose PINs, contact details, or billing info.
    const allOrgs = await base44.asServiceRole.entities.Organization.filter({
      status: 'active'
    });

    const organizations = (allOrgs || []).map((o) => ({
      id: o.id,
      name: o.name,
      tournament_name: o.tournament_name,
      selected_sport: o.selected_sport,
      logo_url: o.logo_url,
      status: o.status,
    }));

    return Response.json({ organizations });
  } catch (error) {
    console.error('getAllOrganizations error:', error?.message || error);
    return Response.json({ error: 'Internal Server Error', organizations: [] }, { status: 500 });
  }
}