import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function getSetWinnersForVolleyball(game) {
  let homeSets = 0;
  let awaySets = 0;
  const sets = Array.isArray(game.quarter_scores) ? game.quarter_scores : [];
  for (const s of sets) {
    const h = Number(s?.home || 0);
    const a = Number(s?.away || 0);
    if (h > a) homeSets++;
    else if (a > h) awaySets++;
  }
  return { homeSets, awaySets };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const organizationId = body.organization_id || user.organization_id || user.active_organization_id;
    if (!organizationId) return Response.json({ error: 'organization_id is required' }, { status: 400 });

    // Fetch teams in org
    const teams = await base44.asServiceRole.entities.Team.filter({ organization_id: organizationId });
    const teamMap = new Map();
    teams.forEach(t => teamMap.set(t.id, { wins: 0, losses: 0 }));

    // Fetch completed games in org
    const games = await base44.asServiceRole.entities.Game.filter({ organization_id: organizationId, status: 'completed' });

    for (const g of games) {
      const homeId = g.home_team_id;
      const awayId = g.away_team_id;
      if (!teamMap.has(homeId) || !teamMap.has(awayId)) continue;

      if (g.sport === 'volleyball') {
        const { homeSets, awaySets } = getSetWinnersForVolleyball(g);
        if (homeSets > awaySets) {
          teamMap.get(homeId).wins++;
          teamMap.get(awayId).losses++;
        } else if (awaySets > homeSets) {
          teamMap.get(awayId).wins++;
          teamMap.get(homeId).losses++;
        } else {
          // If sets not available, fall back to total points
          const h = Number(g.home_score || 0);
          const a = Number(g.away_score || 0);
          if (h > a) { teamMap.get(homeId).wins++; teamMap.get(awayId).losses++; }
          else if (a > h) { teamMap.get(awayId).wins++; teamMap.get(homeId).losses++; }
          // equal points -> skip (cannot decide winner)
        }
      } else {
        // Basketball and others: use final score
        const h = Number(g.home_score || 0);
        const a = Number(g.away_score || 0);
        if (h > a) { teamMap.get(homeId).wins++; teamMap.get(awayId).losses++; }
        else if (a > h) { teamMap.get(awayId).wins++; teamMap.get(homeId).losses++; }
      }
    }

    // Apply updates (only if changed)
    const updates = [];
    for (const t of teams) {
      const rec = teamMap.get(t.id);
      if (!rec) continue;
      const curW = Number(t.wins || 0);
      const curL = Number(t.losses || 0);
      if (rec.wins !== curW || rec.losses !== curL) {
        updates.push(base44.asServiceRole.entities.Team.update(t.id, { wins: rec.wins, losses: rec.losses }));
      }
    }
    if (updates.length) await Promise.all(updates);

    return Response.json({ success: true, updated: updates.length, teams: teams.length, games: games.length });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});