import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Force-finalize all periods for a target basketball/volleyball game
// Usage payload options:
// - { game_id: string }
// - or { home_name: string, away_name: string, division?: string } (matches by substring on team names, most recent game in org)
// Only admins (or scorekeepers within the same org) may run this.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { game_id, home_name, away_name, division } = body || {};

    // Resolve organization
    const orgId = user.organization_id || user.active_organization_id || null;

    // Permission: admin or same-org scorekeeper
    const isAdmin = user.role === 'admin' || !!user.is_super_admin;
    const isScorekeeper = !!user.is_scorekeeper;
    if (!(isAdmin || (isScorekeeper && orgId))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const getTeamMap = async () => {
      const teams = orgId
        ? await base44.asServiceRole.entities.Team.filter({ organization_id: orgId }, undefined, 2000)
        : await base44.asServiceRole.entities.Team.list();
      const byId = new Map(teams.map((t) => [t.id, t]));
      return { teams, byId };
    };

    let game = null;

    if (game_id) {
      game = await base44.asServiceRole.entities.Game.get(game_id);
      if (!game) return Response.json({ error: 'Game not found' }, { status: 404 });
      if (orgId && game.organization_id !== orgId && !isAdmin) {
        return Response.json({ error: 'Game belongs to a different organization' }, { status: 403 });
      }
    } else {
      // Find by team names (substring, case-insensitive), prefer most recent
      if (!home_name || !away_name) {
        return Response.json({ error: 'Provide game_id or home_name and away_name' }, { status: 400 });
      }
      const { teams, byId } = await getTeamMap();
      const completedOrRecent = await base44.asServiceRole.entities.Game.filter(
        Object.assign(
          { sport: 'basketball' },
          orgId ? { organization_id: orgId } : {}
        ),
        '-game_date',
        200
      );
      const hNeedle = String(home_name).toLowerCase();
      const aNeedle = String(away_name).toLowerCase();
      const divNeedle = division ? String(division).toLowerCase() : null;

      for (const g of completedOrRecent) {
        const h = byId.get(g.home_team_id) || teams.find((t) => t.id === g.home_team_id);
        const a = byId.get(g.away_team_id) || teams.find((t) => t.id === g.away_team_id);
        const hName = (h?.name || '').toLowerCase();
        const aName = (a?.name || '').toLowerCase();
        const divName = (g.division || '').toLowerCase();
        const divOk = !divNeedle || divName.includes(divNeedle);
        const match1 = hName.includes(hNeedle) && aName.includes(aNeedle);
        const match2 = hName.includes(aNeedle) && aName.includes(hNeedle); // allow swapped
        if (divOk && (match1 || match2)) { game = g; break; }
      }
      if (!game) {
        return Response.json({ error: 'Game not found by provided team names' }, { status: 404 });
      }
    }

    // Determine how many periods to finalize
    const qLen = Array.isArray(game.quarter_scores) ? game.quarter_scores.length : 0;
    const currentQ = typeof game.current_quarter === 'number' ? game.current_quarter : 0;
    const maxPeriod = Math.max(qLen, currentQ, 4); // ensure up to regulation at least

    const calls = [];
    for (let q = 1; q <= maxPeriod; q++) {
      calls.push(base44.asServiceRole.functions.invoke('finalizePeriodStats', {
        game_id: game.id,
        period_number: q,
      }));
    }

    const results = await Promise.allSettled(calls);
    const summary = results.map((r, idx) => ({
      period: idx + 1,
      status: r.status,
      value: r.status === 'fulfilled' ? r.value?.data || null : String(r.reason || ''),
    }));

    // Return quick counts per team after finalize
    const stats = await base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: game.id }, undefined, 5000);
    const homeCount = stats.filter((s) => s.team_id === game.home_team_id).length;
    const awayCount = stats.filter((s) => s.team_id === game.away_team_id).length;

    return Response.json({
      ok: true,
      game: { id: game.id, date: game.game_date, division: game.division, status: game.status },
      periods_finalized: maxPeriod,
      per_period: summary,
      totals: { records: stats.length, home_records: homeCount, away_records: awayCount },
    });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});