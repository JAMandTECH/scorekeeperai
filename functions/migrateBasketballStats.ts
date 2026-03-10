import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Fixes PlayerGameStats for completed basketball games:
// - Ensures team_id matches the game's home/away team (fallback to player's team)
// - Computes missing/incorrect points from field goals, threes, and free throws
// Admin-only; scoped to the user's organization when available
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { organization_id: bodyOrgId, game_ids: bodyGameIds, dry_run: bodyDryRun } = await (async () => {
      try {
        return await req.json();
      } catch (_) {
        return {};
      }
    })();

    const orgId = bodyOrgId || user.organization_id || user.active_organization_id || null;
    const gameFilter = { sport: 'basketball', status: 'completed' };
    if (orgId) Object.assign(gameFilter, { organization_id: orgId });

    // Load completed basketball games (scoped to org if available)
    const games = await base44.entities.Game.filter(gameFilter);
    if (!games || games.length === 0) {
      return Response.json({
        message: 'No completed basketball games found for scope',
        scope: { organization_id: orgId || 'all' },
      });
    }

    // Optional narrow to provided game_ids
    const targetGameIds = new Set(
      (Array.isArray(bodyGameIds) && bodyGameIds.length > 0 ? bodyGameIds : games.map(g => g.id))
    );

    const gameById = new Map(games.map(g => [g.id, g]));

    // Load players for team lookup (scoped by org's teams when org known)
    let players = [];
    if (orgId) {
      const teams = await base44.entities.Team.filter({ organization_id: orgId });
      const teamIds = teams.map(t => t.id);
      const res = await Promise.all(teamIds.map(id => base44.entities.Player.filter({ team_id: id })));
      players = res.flat();
    } else {
      players = await base44.entities.Player.list();
    }
    const playerById = new Map(players.map(p => [p.id, p]));

    // Fetch stats for target games in chunks
    async function fetchStatsForGames(ids) {
      const results = [];
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        try {
          const part = await base44.entities.PlayerGameStats.filter({ game_id: { $in: chunk } });
          results.push(...part);
        } catch (_) {
          const per = await Promise.all(
            chunk.map((id) => base44.entities.PlayerGameStats.filter({ game_id: id }).catch(() => []))
          );
          results.push(...per.flat());
        }
      }
      return results;
    }

    const allStats = await fetchStatsForGames(Array.from(targetGameIds));

    let processed = 0;
    let teamFixes = 0;
    let pointsFixes = 0;
    let missingGame = 0;
    let unchanged = 0;

    const updates = [];

    for (const s of allStats) {
      processed++;
      const game = gameById.get(s.game_id);
      if (!game || !targetGameIds.has(s.game_id)) {
        missingGame++;
        continue;
      }

      const home = game.home_team_id;
      const away = game.away_team_id;

      let nextTeamId = s.team_id;
      const teamInGame = (tid) => tid === home || tid === away;

      if (!teamInGame(nextTeamId)) {
        const player = playerById.get(s.player_id);
        if (player && teamInGame(player.team_id)) {
          nextTeamId = player.team_id;
        }
      }

      // Compute basketball points when needed
      const storedPts = Number(s.points || 0);
      const threes = Number(s.three_pointers || 0);
      const fgm = Number(s.field_goals_made || 0);
      const ftm = Number(s.free_throws_made || 0);
      const twos = Math.max(fgm - threes, 0);
      const computedPts = (twos * 2) + (threes * 3) + ftm;

      const patch = {};
      if (nextTeamId && nextTeamId !== s.team_id && teamInGame(nextTeamId)) {
        patch.team_id = nextTeamId;
        teamFixes++;
      }
      if (computedPts > 0 && storedPts !== computedPts) {
        patch.points = computedPts;
        pointsFixes++;
      }

      if (Object.keys(patch).length > 0) {
        updates.push({ id: s.id, data: patch });
      } else {
        unchanged++;
      }
    }

    const dryRun = bodyDryRun === true; // default is apply changes

    // Apply updates in batches unless dry run
    let applied = 0;
    if (!dryRun && updates.length > 0) {
      for (let i = 0; i < updates.length; i += 25) {
        const chunk = updates.slice(i, i + 25);
        await Promise.all(
          chunk.map(u => base44.entities.PlayerGameStats.update(u.id, u.data))
        );
        applied += chunk.length;
      }
    }

    return Response.json({
      scope: { organization_id: orgId || 'all', total_games: targetGameIds.size },
      summary: {
        processed,
        updates: updates.length,
        applied: dryRun ? 0 : applied,
        teamFixes,
        pointsFixes,
        missingGame,
        unchanged,
        dryRun,
      }
    });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});