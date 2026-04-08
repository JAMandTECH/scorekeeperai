import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth optional for public dashboards; ignore failures
    try { await base44.auth.me(); } catch (_) {}

    let payload = {};
    try { payload = await req.json(); } catch (_) { payload = {}; }

    const organizationId = payload.organization_id || null;
    const limit = Math.max(1, Math.min(Number(payload.limit) || 10, 50));
    const sport = String(payload.sport || 'basketball').toLowerCase();
    const division = payload.division != null ? String(payload.division).toLowerCase() : null;

    // Fetch teams and completed games (service role to avoid RLS issues for public)
    const [teamsRaw, gamesRaw] = await Promise.all([
      organizationId
        ? base44.asServiceRole.entities.Team.filter({ organization_id: organizationId })
        : base44.asServiceRole.entities.Team.list(),
      organizationId
        ? base44.asServiceRole.entities.Game.filter({ organization_id: organizationId, status: 'completed' })
        : base44.asServiceRole.entities.Game.filter({ status: 'completed' })
    ]);

    // Filter by sport and optional division
    const teams = (teamsRaw || []).filter((t) => {
      const sportMatch = String(t.sport || '').toLowerCase() === sport;
      if (!sportMatch) return false;
      if (!division) return true;
      const div = String(t.division || '').toLowerCase();
      return div.includes(division);
    });

    const games = (gamesRaw || []).filter((g) => {
      const sportMatch = String(g.sport || '').toLowerCase() === sport;
      if (!sportMatch) return false;
      if (!division) return true;
      const div = String(g.division || '').toLowerCase();
      return div.includes(division);
    });

    if (!teams.length || !games.length) {
      return Response.json({ leaders: [], count: 0, sport, division, organization_id: organizationId });
    }

    const teamIds = teams.map((t) => t.id);
    const teamIdSet = new Set(teamIds);
    const completedGameIds = games.map((g) => g.id);
    const completedSet = new Set(completedGameIds);

    // Pull stats per team to limit volume, then keep only completed games
    const statChunks = await Promise.all(
      teamIds.map((tid) => base44.asServiceRole.entities.PlayerGameStats.filter({ team_id: tid }))
    );
    const allStats = ([]).concat(...statChunks).filter((s) => completedSet.has(s.game_id));

    if (!allStats.length) {
      return Response.json({ leaders: [], count: 0, sport, division, organization_id: organizationId });
    }

    // Build a team map for quick lookups
    const teamMap = new Map(teams.map((t) => [t.id, t]));

    // Fetch players per team (fewer calls than fetching by each player id)
    const playersByTeamChunks = await Promise.all(
      teamIds.map((tid) => base44.asServiceRole.entities.Player.filter({ team_id: tid }))
    );
    const players = ([]).concat(...playersByTeamChunks);
    const playerMap = new Map(players.map((p) => [p.id, p]));

    // Aggregate assists per player
    const agg = new Map(); // player_id -> { total_assists: number, games: Set<game_id> }
    for (const s of allStats) {
      const pid = s.player_id;
      if (!pid || !playerMap.has(pid)) continue;
      if (!agg.has(pid)) agg.set(pid, { total_assists: 0, games: new Set() });
      const rec = agg.get(pid);
      rec.total_assists += Number(s.assists || 0);
      rec.games.add(s.game_id);
    }

    // Build response
    const leaders = Array.from(agg.entries())
      .map(([playerId, { total_assists, games }]) => {
        const player = playerMap.get(playerId) || {};
        const team = teamMap.get(player.team_id) || {};
        const gamesPlayed = games.size;
        const apg = gamesPlayed > 0 ? Number((total_assists / gamesPlayed).toFixed(1)) : 0;
        return {
          player_id: playerId,
          first_name: player.first_name,
          last_name: player.last_name,
          jersey_number: player.jersey_number || '',
          team_id: player.team_id,
          team_name: team.name || 'Unknown',
          team_logo_url: team.logo_url || '',
          total_assists,
          games_played: gamesPlayed,
          apg,
          photo_url: player.photo_url || ''
        };
      })
      .filter((p) => p.total_assists > 0)
      .sort((a, b) => b.total_assists - a.total_assists)
      .slice(0, limit);

    return Response.json({ leaders, count: leaders.length, sport, division, organization_id: organizationId });
  } catch (error) {
    console.error('getTopAssistLeaders error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});