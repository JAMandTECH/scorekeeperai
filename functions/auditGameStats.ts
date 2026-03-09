import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Audits completed games vs PlayerGameStats for the current user's organization
// Returns summary + per-game counts, plus orphans (stats pointing to missing games)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only: this audits org data
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch teams for name mapping
    const teams = await base44.entities.Team.filter({ organization_id: user.organization_id });
    const teamMap = new Map(teams.map(t => [t.id, t]));

    // Fetch completed games in org (not archived and archived both, we audit all completed)
    const games = await base44.entities.Game.filter({ organization_id: user.organization_id, status: 'completed' }, '-game_date', 500);
    const gameIds = games.map(g => g.id);

    // Helper to chunk an array
    const chunk = (arr, size) => {
      const out = []; for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size)); return out;
    };

    // Fetch stats for these games in chunks (API may limit $in size)
    let statsForCompleted = [];
    if (gameIds.length > 0) {
      const chunks = chunk(gameIds, 50);
      for (const c of chunks) {
        try {
          const part = await base44.entities.PlayerGameStats.filter({ game_id: { $in: c } }, '-updated_date', 1000);
          statsForCompleted.push(...(Array.isArray(part) ? part : []));
        } catch (_) {
          // Fallback to per-id when $in not supported
          const per = await Promise.all(c.map(id => base44.entities.PlayerGameStats.filter({ game_id: id }).catch(() => [])));
          statsForCompleted.push(...per.flat());
        }
      }
    }

    // Build per-game counts
    const countsByGame = new Map();
    for (const gId of gameIds) countsByGame.set(gId, 0);
    for (const s of statsForCompleted) {
      const gid = s.game_id; if (countsByGame.has(gid)) countsByGame.set(gid, countsByGame.get(gid) + 1);
    }

    const gamesWithNoStats = games.filter(g => (countsByGame.get(g.id) || 0) === 0);

    // Identify orphan stats: stats whose game_id is not any existing Game
    // Fetch a recent window of stats to avoid scanning the world (last 2,000 by updated)
    const recentStats = await base44.entities.PlayerGameStats.list('-updated_date', 2000);
    // Build a set of ALL known game ids (across org) from a recent slice to detect missing refs
    const recentGames = await base44.entities.Game.list('-updated_date', 2000);
    const knownGameIds = new Set(recentGames.map(g => g.id));
    const orphanStats = recentStats.filter(s => !knownGameIds.has(s.game_id));

    // Also find cross-org stats: stats whose game exists but not in this org or not completed
    const gameById = new Map(recentGames.map(g => [g.id, g]));
    const crossOrgOrNotCompleted = recentStats.filter(s => {
      const g = gameById.get(s.game_id);
      if (!g) return false; // handled as orphan above
      const inOrg = g.organization_id === user.organization_id;
      const completed = g.status === 'completed';
      return (!inOrg) || (!completed);
    });

    const summarizeGame = (g) => ({
      id: g.id,
      sport: g.sport,
      date: g.game_date,
      home_team: teamMap.get(g.home_team_id)?.name || g.home_team_id,
      away_team: teamMap.get(g.away_team_id)?.name || g.away_team_id,
      stats_count: countsByGame.get(g.id) || 0,
    });

    const summary = {
      organization_id: user.organization_id,
      totals: {
        completed_games: games.length,
        games_with_stats: games.length - gamesWithNoStats.length,
        games_without_stats: gamesWithNoStats.length,
        orphan_stats_sampled: orphanStats.length,
        cross_org_or_not_completed_stats_sampled: crossOrgOrNotCompleted.length,
      },
      samples: {
        missing_games: gamesWithNoStats.slice(0, 10).map(summarizeGame),
        with_stats: games.filter(g => (countsByGame.get(g.id) || 0) > 0).slice(0, 10).map(summarizeGame),
        orphan_stat_ids: orphanStats.slice(0, 20).map(s => s.id),
        cross_org_or_not_completed_stat_ids: crossOrgOrNotCompleted.slice(0, 20).map(s => s.id),
      }
    };

    return Response.json(summary);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});