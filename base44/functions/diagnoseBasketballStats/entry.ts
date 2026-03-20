import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Diagnose PlayerGameStats coverage for completed basketball games within an org
// - Per game: linked stats count, unique players, and stray stats per team (stats for team but linked to different game)
// - Overall: how many stats belong to basketball vs volleyball teams (helps spot misclassification)
// Admin-only, uses service role for cross-entity reads.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { organization_id: bodyOrgId, game_ids: bodyGameIds } = await (async () => {
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

    const gameIds = new Set((Array.isArray(bodyGameIds) && bodyGameIds.length > 0) ? bodyGameIds : games.map(g => g.id));
    const targetGames = games.filter(g => gameIds.has(g.id));

    // Teams in org (for sport/type and naming)
    const teams = orgId
      ? await base44.asServiceRole.entities.Team.filter({ organization_id: orgId })
      : await base44.asServiceRole.entities.Team.list();
    const teamById = new Map(teams.map(t => [t.id, t]));

    // Fetch all stats for teams in org (chunked by team_id)
    const teamIds = teams.map(t => t.id);
    const allStats = [];
    for (let i = 0; i < teamIds.length; i += 50) {
      const chunk = teamIds.slice(i, i + 50);
      try {
        const part = await base44.asServiceRole.entities.PlayerGameStats.filter({ team_id: { $in: chunk } });
        allStats.push(...part);
      } catch (_) {
        const per = await Promise.all(chunk.map(id => base44.asServiceRole.entities.PlayerGameStats.filter({ team_id: id }).catch(() => [])));
        allStats.push(...per.flat());
      }
    }

    // Indexes
    const statsByGameId = new Map();
    const statsByTeamId = new Map();
    let basketballStatsCount = 0;
    let volleyballStatsCount = 0;

    for (const s of allStats) {
      const t = teamById.get(s.team_id);
      if (t?.sport === 'basketball') basketballStatsCount++; else if (t?.sport === 'volleyball') volleyballStatsCount++;

      if (s.game_id) {
        if (!statsByGameId.has(s.game_id)) statsByGameId.set(s.game_id, []);
        statsByGameId.get(s.game_id).push(s);
      }
      if (s.team_id) {
        if (!statsByTeamId.has(s.team_id)) statsByTeamId.set(s.team_id, []);
        statsByTeamId.get(s.team_id).push(s);
      }
    }

    const perGame = [];
    let gamesWithZeroLinked = 0;

    for (const g of targetGames) {
      const linked = (statsByGameId.get(g.id) || []).filter(s => teamById.get(s.team_id)?.sport === 'basketball');
      const linkedPlayers = new Set(linked.map(s => s.player_id));

      const hTeamAll = statsByTeamId.get(g.home_team_id) || [];
      const aTeamAll = statsByTeamId.get(g.away_team_id) || [];

      // Stray = stats for that team but not linked to this game (basketball teams only)
      const strayHome = hTeamAll.filter(s => s.game_id !== g.id && teamById.get(s.team_id)?.sport === 'basketball');
      const strayAway = aTeamAll.filter(s => s.game_id !== g.id && teamById.get(s.team_id)?.sport === 'basketball');

      if (linked.length === 0) gamesWithZeroLinked++;

      perGame.push({
        game_id: g.id,
        game_date: g.game_date,
        division: g.division || null,
        home_team_id: g.home_team_id,
        home_team_name: teamById.get(g.home_team_id)?.name || g.home_team_id,
        away_team_id: g.away_team_id,
        away_team_name: teamById.get(g.away_team_id)?.name || g.away_team_id,
        linked_count: linked.length,
        unique_players_linked: linkedPlayers.size,
        stray_home_count: strayHome.length,
        stray_away_count: strayAway.length,
      });
    }

    // Sort per-game by date asc
    perGame.sort((a, b) => new Date(a.game_date) - new Date(b.game_date));

    return Response.json({
      scope: { organization_id: orgId || 'all', games_count: targetGames.length, teams_count: teams.length },
      totals: { basketballStatsCount, volleyballStatsCount, gamesWithZeroLinked },
      per_game: perGame,
    });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});