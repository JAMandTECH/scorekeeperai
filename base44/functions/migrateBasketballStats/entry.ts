import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Migration: Repair PlayerGameStats for completed basketball games within an organization
// - Recompute points from (FGM/3PM/FTM) when missing/incorrect
// - Fix team_id: prefer team from game; fallback to player's team if valid
// - Relink stats with wrong/missing game_id to the nearest completed game for that team by created_date
// Admin-only. Uses service role for reliable cross-entity access after auth check.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { organization_id: bodyOrgId, game_ids: bodyGameIds, dry_run } = await (async () => {
      try { return await req.json(); } catch { return {}; }
    })();

    const orgId = bodyOrgId || user.organization_id || user.active_organization_id || null;

    // Load completed basketball games in org
    const gameFilter = { sport: 'basketball', status: 'completed' };
    if (orgId) Object.assign(gameFilter, { organization_id: orgId });
    const games = await base44.asServiceRole.entities.Game.filter(gameFilter);

    if (!games?.length) {
      return Response.json({ message: 'No completed basketball games found for scope', scope: { organization_id: orgId || 'all' } });
    }

    const gameById = new Map(games.map(g => [g.id, g]));
    const targetGameIds = new Set((Array.isArray(bodyGameIds) && bodyGameIds.length > 0) ? bodyGameIds : games.map(g => g.id));

    // Load teams and players for org (for mapping team->games and player->team fallback)
    const teams = orgId
      ? await base44.asServiceRole.entities.Team.filter({ organization_id: orgId })
      : await base44.asServiceRole.entities.Team.list();
    const basketballTeams = teams.filter(t => t.sport === 'basketball');
    const teamIds = basketballTeams.map(t => t.id);
    const teamById = new Map(teams.map(t => [t.id, t]));

    // Build per-team completed games sorted by date
    const teamGames = new Map();
    for (const t of basketballTeams) teamGames.set(t.id, []);
    for (const g of games) {
      const arrH = teamGames.get(g.home_team_id); if (arrH) arrH.push(g);
      const arrA = teamGames.get(g.away_team_id); if (arrA) arrA.push(g);
    }
    for (const [tid, arr] of teamGames.entries()) arr.sort((a,b)=> new Date(a.game_date) - new Date(b.game_date));

    // Load players (for fallback to player's team)
    let players = [];
    if (teamIds.length) {
      const chunks = [];
      for (let i=0;i<teamIds.length;i+=50) chunks.push(teamIds.slice(i,i+50));
      const results = await Promise.all(chunks.map(ch => base44.asServiceRole.entities.Player.filter({ team_id: { $in: ch } })));
      players = results.flat();
    } else {
      players = await base44.asServiceRole.entities.Player.list();
    }
    const playerById = new Map(players.map(p => [p.id, p]));

    // Fetch ALL stats for these teams (not just currently linked games) so we can relink
    async function fetchStatsByTeams(ids) {
      const out = [];
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        try {
          const part = await base44.asServiceRole.entities.PlayerGameStats.filter({ team_id: { $in: chunk } });
          out.push(...part);
        } catch (_) {
          // Best-effort fallback per team
          const per = await Promise.all(chunk.map(id => base44.asServiceRole.entities.PlayerGameStats.filter({ team_id: id }).catch(()=>[])));
          out.push(...per.flat());
        }
      }
      return out;
    }

    const stats = await fetchStatsByTeams(teamIds);

    // Helper: pick nearest completed game for a team to a given timestamp
    function findNearestGameForTeam(teamId, when) {
      const arr = teamGames.get(teamId) || [];
      if (!arr.length) return null;
      const ts = when ? new Date(when).getTime() : null;
      if (!ts) return arr[arr.length-1] || null; // fallback to latest
      let best = null, bestDiff = Number.POSITIVE_INFINITY;
      for (const g of arr) {
        const diff = Math.abs(new Date(g.game_date).getTime() - ts);
        if (diff < bestDiff) { best = g; bestDiff = diff; }
      }
      return best;
    }

    let processed = 0;
    let applied = 0;
    let updatesQueued = 0;
    let teamFixes = 0;
    let pointsFixes = 0;
    let relinked = 0;
    let unchanged = 0;

    const updates = [];

    for (const s of stats) {
      processed++;

      // Determine intended team for basketball context
      let intendedTeamId = s.team_id && teamById.has(s.team_id) ? s.team_id : null;
      if (!intendedTeamId) {
        const pl = playerById.get(s.player_id);
        if (pl && teamById.has(pl.team_id)) intendedTeamId = pl.team_id;
      }
      const team = intendedTeamId ? teamById.get(intendedTeamId) : null;
      if (!team || team.sport !== 'basketball') { unchanged++; continue; }

      const patch = {};

      // Validate/compute points for basketball
      const storedPts = Number(s.points || 0);
      const threes = Number(s.three_pointers || 0);
      const fgm = Number(s.field_goals_made || 0);
      const ftm = Number(s.free_throws_made || 0);
      const twos = Math.max(fgm - threes, 0);
      const computedPts = (twos * 2) + (threes * 3) + ftm;
      if (computedPts > 0 && storedPts !== computedPts) {
        patch.points = computedPts;
        pointsFixes++;
      }

      // Fix team_id if not matching org team set or does not belong to target game
      if (intendedTeamId && intendedTeamId !== s.team_id) {
        patch.team_id = intendedTeamId;
        teamFixes++;
      }

      // Ensure game_id points to a completed basketball game for this team
      let needsRelink = false;
      const currentGame = s.game_id ? gameById.get(s.game_id) : null;
      const inTarget = s.game_id && targetGameIds.has(s.game_id) && currentGame && (currentGame.home_team_id === intendedTeamId || currentGame.away_team_id === intendedTeamId);
      if (!inTarget) needsRelink = true;

      if (needsRelink) {
        const near = findNearestGameForTeam(intendedTeamId, s.created_date || s.updated_date);
        if (near && targetGameIds.has(near.id)) {
          if (near.id !== s.game_id) {
            patch.game_id = near.id;
            relinked++;
          }
        } else {
          // Could not find a matching completed game for this team; skip relink
        }
      }

      if (Object.keys(patch).length) {
        updates.push({ id: s.id, data: patch });
        updatesQueued++;
      } else {
        unchanged++;
      }
    }

    if (!dry_run && updates.length) {
      for (let i = 0; i < updates.length; i += 25) {
        const chunk = updates.slice(i, i + 25);
        await Promise.all(chunk.map(u => base44.asServiceRole.entities.PlayerGameStats.update(u.id, u.data)));
        applied += chunk.length;
      }
    }

    return Response.json({
      scope: { organization_id: orgId || 'all', total_games: targetGameIds.size },
      summary: { processed, updatesQueued, applied: dry_run ? 0 : applied, teamFixes, pointsFixes, relinked, unchanged, dryRun: !!dry_run }
    });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});