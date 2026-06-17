import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(fn, attempt = 1) {
  try {
    return await fn();
  } catch (err) {
    const msg = String(err?.message || '');
    const isRateLimited = /429|rate limit/i.test(msg);
    if (isRateLimited && attempt < 6) {
      await sleep(300 * Math.pow(2, attempt - 1));
      return fetchWithRetry(fn, attempt + 1);
    }
    throw err;
  }
}

async function fetchPlayersForTeams(base44, teamIds) {
  const ids = Array.from(new Set((teamIds || []).filter(Boolean)));
  const players = [];
  for (let i = 0; i < ids.length; i += 3) {
    const batch = ids.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map((teamId) => base44.asServiceRole.entities.Player.filter({ team_id: teamId }).catch(() => []))
    );
    players.push(...batchResults.flat());
    if (i + 3 < ids.length) await sleep(200);
  }
  return players;
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

    // FAST PATH: read pre-aggregated season stats (tiny table). Filter by sport.
    const seasonStats = await fetchWithRetry(() =>
      base44.asServiceRole.entities.PlayerSeasonStats.filter({ organization_id: organizationId, sport })
    );

    if (!Array.isArray(seasonStats) || seasonStats.length === 0) {
      // No aggregated data yet (backfill may still be running). Return empty rather than running a heavy scan.
      return Response.json({ leaders: [], count: 0, sport, division, organization_id: organizationId });
    }

    // Load teams for names/logos and optional division filtering
    const teamsRaw = await fetchWithRetry(() =>
      base44.asServiceRole.entities.Team.filter({ organization_id: organizationId })
    );
    const teamMap = new Map((teamsRaw || []).map((t) => [t.id, t]));

    // Need player details for names/photos/jersey
    const teamIds = Array.from(new Set(seasonStats.map((s) => s.team_id).filter(Boolean)));
    const players = await fetchPlayersForTeams(base44, teamIds);
    const playerMap = new Map(players.map((p) => [p.id, p]));

    const leaders = seasonStats
      .map((s) => {
        const player = playerMap.get(s.player_id) || {};
        const team = teamMap.get(player.team_id || s.team_id) || {};
        const totalAssists = Number(s.total_assists || 0);
        const gamesPlayed = Number(s.games_played || 0);
        const apg = gamesPlayed > 0 ? Number((totalAssists / gamesPlayed).toFixed(1)) : 0;
        return {
          player_id: s.player_id,
          first_name: player.first_name,
          last_name: player.last_name,
          jersey_number: player.jersey_number || '',
          team_id: player.team_id || s.team_id,
          team_name: team.name || 'Unknown',
          team_logo_url: team.logo_url || '',
          team_division: team.division || '',
          total_assists: totalAssists,
          games_played: gamesPlayed,
          apg,
          photo_url: player.photo_url || ''
        };
      })
      // Only include players whose team still exists and matches the optional division filter
      .filter((p) => {
        if (!playerMap.has(p.player_id)) return false;
        if (p.total_assists <= 0) return false;
        if (!division) return true;
        return String(p.team_division || '').toLowerCase().includes(division);
      })
      .sort((a, b) => b.total_assists - a.total_assists)
      .slice(0, limit);

    return Response.json({ leaders, count: leaders.length, sport, division, organization_id: organizationId });
  } catch (error) {
    console.error('getTopAssistLeaders error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});