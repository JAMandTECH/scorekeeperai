import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload = {};
    try { payload = await req.json(); } catch (_) { payload = {}; }

    const organizationId = payload.organization_id || user.active_organization_id || user.organization_id || null;
    const limit = Math.max(1, Math.min(Number(payload.limit) || 10, 50));
    const sport = (payload.sport || 'basketball').toLowerCase();

    // Fetch entities
    const [allTeams, allPlayers, allGames, allStats] = await Promise.all([
      base44.entities.Team.list(),
      base44.entities.Player.list(),
      base44.entities.Game.list(),
      base44.entities.PlayerGameStats.list(),
    ]);

    // Filter to sport + org scope (if provided)
    const teams = allTeams.filter(t => t.sport === sport && (!organizationId || t.organization_id === organizationId));
    const teamIds = new Set(teams.map(t => t.id));

    const players = allPlayers.filter(p => teamIds.has(p.team_id));
    const playerMap = new Map(players.map(p => [p.id, p]));

    const games = allGames.filter(g => g.status === 'completed' && g.sport === sport && (!organizationId || g.organization_id === organizationId));
    const completedGameIds = new Set(games.map(g => g.id));

    // Relevant stats only (completed games + within selected teams)
    const relevantStats = allStats.filter(s => completedGameIds.has(s.game_id) && teamIds.has(s.team_id));

    // Aggregate assists per player
    const agg = new Map();
    for (const s of relevantStats) {
      const pid = s.player_id;
      if (!playerMap.has(pid)) continue;
      if (!agg.has(pid)) {
        agg.set(pid, { total_assists: 0, games: new Set() });
      }
      const rec = agg.get(pid);
      rec.total_assists += (s.assists || 0);
      rec.games.add(s.game_id);
    }

    // Build leaders list
    const teamMap = new Map(teams.map(t => [t.id, t]));
    const leaders = Array.from(agg.entries())
      .map(([playerId, { total_assists, games }]) => {
        const player = playerMap.get(playerId);
        const team = teamMap.get(player.team_id);
        const gamesPlayed = games.size;
        const apg = gamesPlayed > 0 ? Number((total_assists / gamesPlayed).toFixed(1)) : 0;
        return {
          player_id: playerId,
          first_name: player.first_name,
          last_name: player.last_name,
          jersey_number: player.jersey_number || '',
          team_id: player.team_id,
          team_name: team?.name || 'Unknown',
          team_logo_url: team?.logo_url || '',
          total_assists,
          games_played: gamesPlayed,
          apg,
        };
      })
      .filter(p => p.total_assists > 0)
      .sort((a, b) => b.total_assists - a.total_assists)
      .slice(0, limit);

    return Response.json({ leaders, count: leaders.length, sport, organization_id: organizationId || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});