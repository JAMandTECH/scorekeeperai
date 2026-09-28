import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(fn, attempt = 1) {
  try {
    return await fn();
  } catch (err) {
    const msg = String(err?.message || '');
    const isRateLimited = /429|rate limit/i.test(msg);
    if (isRateLimited && attempt < 6) {
      await sleep(400 * Math.pow(2, attempt - 1));
      return fetchWithRetry(fn, attempt + 1);
    }
    throw err;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    try { await base44.auth.me(); } catch (_) {}

    let payload = {};
    try { payload = await req.json(); } catch (_) { payload = {}; }

    const organizationId = payload.organization_id || null;
    const limit = Math.max(1, Math.min(Number(payload.limit) || 10, 50));
    const sport = String(payload.sport || 'basketball').toLowerCase();
    const division = payload.division != null ? String(payload.division).toLowerCase() : null;

    if (!organizationId) {
      return Response.json({ leaders: [], count: 0, sport, division, organization_id: organizationId });
    }

    // Teams (names/logos/division)
    const teamsRaw = await fetchWithRetry(() =>
      base44.asServiceRole.entities.Team.filter({ organization_id: organizationId })
    );
    const teamMap = new Map((teamsRaw || []).map((t) => [t.id, t]));

    // Teams that belong to this sport + optional division
    const eligibleTeamIds = new Set(
      (teamsRaw || [])
        .filter((t) => {
          if (sport && String(t.sport || '').toLowerCase() !== sport) return false;
          if (division && !String(t.division || '').toLowerCase().includes(division)) return false;
          return true;
        })
        .map((t) => t.id)
    );

    if (eligibleTeamIds.size === 0) {
      return Response.json({ leaders: [], count: 0, sport, division, organization_id: organizationId });
    }

    // Completed games for this sport. Count games played per team (average divisor)
    // and collect the game IDs those eligible teams participated in.
    const completedGames = await fetchWithRetry(() =>
      base44.asServiceRole.entities.Game.filter({ organization_id: organizationId, status: 'completed' })
    );
    const teamGamesPlayed = new Map();
    const eligibleGameIds = [];
    (completedGames || []).forEach((g) => {
      if (sport && String(g.sport || '').toLowerCase() !== sport) return;
      const homeEligible = eligibleTeamIds.has(g.home_team_id);
      const awayEligible = eligibleTeamIds.has(g.away_team_id);
      if (g.home_team_id) teamGamesPlayed.set(g.home_team_id, (teamGamesPlayed.get(g.home_team_id) || 0) + 1);
      if (g.away_team_id) teamGamesPlayed.set(g.away_team_id, (teamGamesPlayed.get(g.away_team_id) || 0) + 1);
      if (homeEligible || awayEligible) eligibleGameIds.push(g.id);
    });

    if (eligibleGameIds.length === 0) {
      return Response.json({ leaders: [], count: 0, sport, division, organization_id: organizationId });
    }

    // Aggregate assists from RAW PlayerGameStats (source of truth).
    // Query by the small set of eligible team IDs (few teams) rather than by
    // the large set of game IDs — far fewer DB calls, avoids rate limits.
    const eligibleGameIdSet = new Set(eligibleGameIds);
    const assistTotals = new Map(); // player_id -> total assists
    const playerTeam = new Map();   // player_id -> team_id (from the stat rows)
    const teamIdList = Array.from(eligibleTeamIds);
    for (let i = 0; i < teamIdList.length; i += 5) {
      const chunk = teamIdList.slice(i, i + 5);
      const stats = await fetchWithRetry(() =>
        base44.asServiceRole.entities.PlayerGameStats.filter({ team_id: { $in: chunk } })
      );
      (stats || []).forEach((s) => {
        // Only count stats from completed games in this sport+division.
        if (!eligibleGameIdSet.has(s.game_id)) return;
        assistTotals.set(s.player_id, (assistTotals.get(s.player_id) || 0) + Number(s.assists || 0));
        if (!playerTeam.has(s.player_id)) playerTeam.set(s.player_id, s.team_id);
      });
      if (i + 5 < teamIdList.length) await sleep(300);
    }

    // Load player details for the players who actually have stats
    const playerIds = Array.from(assistTotals.keys());
    const players = [];
    for (let i = 0; i < playerIds.length; i += 40) {
      const chunk = playerIds.slice(i, i + 40);
      const part = await fetchWithRetry(() =>
        base44.asServiceRole.entities.Player.filter({ id: { $in: chunk } })
      );
      players.push(...(part || []));
      if (i + 40 < playerIds.length) await sleep(120);
    }
    const playerMap = new Map(players.map((p) => [p.id, p]));

    const leaders = playerIds
      .map((playerId) => {
        const player = playerMap.get(playerId) || {};
        const teamId = player.team_id || playerTeam.get(playerId);
        const team = teamMap.get(teamId) || {};
        const totalAssists = Number(assistTotals.get(playerId) || 0);
        const gamesPlayed = Number(teamGamesPlayed.get(teamId) || 0);
        const apg = gamesPlayed > 0 ? Number((totalAssists / gamesPlayed).toFixed(1)) : 0;
        return {
          player_id: playerId,
          first_name: player.first_name,
          last_name: player.last_name,
          jersey_number: player.jersey_number || '',
          team_id: teamId,
          team_name: team.name || 'Unknown',
          team_logo_url: team.logo_url || '',
          team_division: team.division || '',
          total_assists: totalAssists,
          games_played: gamesPlayed,
          apg,
          photo_url: player.photo_url || ''
        };
      })
      .filter((p) => p.total_assists > 0)
      .sort((a, b) => b.apg - a.apg || b.total_assists - a.total_assists)
      .slice(0, limit);

    return Response.json({ leaders, count: leaders.length, sport, division, organization_id: organizationId });
  } catch (error) {
    console.error('getTopAssistLeaders error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});