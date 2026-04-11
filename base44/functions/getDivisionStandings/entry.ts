import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const orgId = payload.orgId || payload.organization_id;
    const sport = (payload.sport || 'basketball').toLowerCase();
    const division = payload.division || '';
    const limit = Number(payload.limit || 200);

    if (!orgId) {
      return Response.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Fetch teams via service role (public read-only endpoint)
    const teams = await base44.asServiceRole.entities.Team.filter({ organization_id: orgId, sport }, '-wins', limit);

    const divNorm = division ? String(division).toLowerCase().trim() : '';
    const filtered = divNorm
      ? teams.filter((t) => (String(t.division || '').toLowerCase()).includes(divNorm))
      : teams;

    const sorted = filtered
      .slice()
      .sort((a, b) => {
        const aw = a.wins ?? 0, bw = b.wins ?? 0;
        const al = a.losses ?? 0, bl = b.losses ?? 0;
        if (bw !== aw) return bw - aw; // wins desc
        if (al !== bl) return al - bl; // losses asc
        return String(a.name || '').localeCompare(String(b.name || ''));
      })
      .map((t, idx) => {
        const wins = Number(t.wins || 0);
        const losses = Number(t.losses || 0);
        const gp = wins + losses;
        const win_pct = gp > 0 ? Number((wins / gp).toFixed(3)) : 0;
        return {
          rank: idx + 1,
          team_id: t.id,
          name: t.name,
          division: t.division || '',
          wins,
          losses,
          win_pct,
          logo_url: t.logo_url || null,
        };
      });

    const orgArr = await base44.asServiceRole.entities.Organization.filter({ id: orgId });
    const org = orgArr?.[0] || null;

    return Response.json({
      organization: org ? { id: org.id, name: org.name } : { id: orgId },
      sport,
      division: division || null,
      teams: sorted,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('getDivisionStandings error', error);
    return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
});