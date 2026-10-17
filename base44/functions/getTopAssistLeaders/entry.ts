import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isSuperAdmin, resolveCallerOrg } from '../../shared/orgAuth.ts';

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

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let payload = {};
    try { payload = await req.json(); } catch (_) { payload = {}; }

    // Scope to the caller's org; only super admins may target another org.
    const callerOrg = resolveCallerOrg(user);
    const requestedOrg = payload.organization_id || null;
    const organizationId = isSuperAdmin(user)
      ? (requestedOrg || callerOrg || null)
      : callerOrg;
    if (!isSuperAdmin(user) && requestedOrg && callerOrg && requestedOrg !== callerOrg) {
      return Response.json({ error: 'Forbidden: cannot access another organization' }, { status: 403 });
    }
    const limit = Math.max(1, Math.min(Number(payload.limit) || 10, 50));
    const sport = String(payload.sport || 'basketball').toLowerCase();
    // Exact-match division (case-sensitive), mirroring buildLeaderboard which
    // compares against `team.division || "No Division"` with === .
    const division = payload.division != null ? String(payload.division) : null;

    if (!organizationId) {
      return Response.json({ leaders: [], count: 0, sport, division, organization_id: organizationId });
    }

    // Teams (names/logos/division) — canonical source mirrors buildLeaderboard.
    const teamsRaw = await fetchWithRetry(() =>
      base44.asServiceRole.entities.Team.filter({ organization_id: organizationId })
    );
    const teamMap = new Map((teamsRaw || []).map((t) => [t.id, t]));

    // Eligible games: completed, matching sport, and matching division at the
    // GAME level (either home or away team's division equals the target), exactly
    // like buildLeaderboard. This determines both the stat rows counted and the
    // per-team games-played divisor.
    const completedGames = await fetchWithRetry(() =>
      base44.asServiceRole.entities.Game.filter({ organization_id: organizationId, status: 'completed' })
    );
    const eligibleGames = (completedGames || []).filter((g) => {
      if (sport && String(g.sport || '').toLowerCase() !== sport.toLowerCase()) return false;
      if (division) {
        const homeDiv = teamMap.get(g.home_team_id)?.division || 'No Division';
        const awayDiv = teamMap.get(g.away_team_id)?.division || 'No Division';
        if (homeDiv !== division && awayDiv !== division) return false;
      }
      return true;
    });
    const eligibleGameIdSet = new Set(eligibleGames.map((g) => g.id));

    if (eligibleGameIdSet.size === 0) {
      return Response.json({ leaders: [], count: 0, sport, division, organization_id: organizationId });
    }

    // Games played per team — divisor matches buildLeaderboard (eligible games only).
    const teamGamesPlayed = new Map();
    eligibleGames.forEach((g) => {
      if (g.home_team_id) teamGamesPlayed.set(g.home_team_id, (teamGamesPlayed.get(g.home_team_id) || 0) + 1);
      if (g.away_team_id) teamGamesPlayed.set(g.away_team_id, (teamGamesPlayed.get(g.away_team_id) || 0) + 1);
    });

    // Aggregate assists from RAW PlayerGameStats (source of truth), querying by
    // the eligible game IDs in chunks. Team attribution uses the stat row's
    // team_id (first row wins), matching buildLeaderboard — NOT Player.team_id.
    const assistTotals = new Map(); // player_id -> total assists
    const playerTeam = new Map();   // player_id -> team_id (from the stat rows)
    const gameIdList = Array.from(eligibleGameIdSet);
    for (let i = 0; i < gameIdList.length; i += 10) {
      const chunk = gameIdList.slice(i, i + 10);
      const stats = await fetchWithRetry(() =>
        base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: { $in: chunk } })
      );
      (stats || []).forEach((s) => {
        // Division filter at the stat-row level, matching buildLeaderboard.
        const statTeam = teamMap.get(s.team_id);
        if (division) {
          const statDiv = statTeam?.division || 'No Division';
          if (statDiv !== division) return;
        }
        assistTotals.set(s.player_id, (assistTotals.get(s.player_id) || 0) + Number(s.assists || 0));
        if (!playerTeam.has(s.player_id)) playerTeam.set(s.player_id, s.team_id);
      });
      if (i + 10 < gameIdList.length) await sleep(300);
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
        // Use the stat row's team_id (first row wins), NOT player.team_id —
        // matches buildLeaderboard so a transfer never shifts attribution.
        const teamId = playerTeam.get(playerId);
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
      // Deterministic ordering: APG desc, then total desc, then player_id asc
      // so identical data always produces identical rankings across refreshes.
      .sort((a, b) => b.apg - a.apg || b.total_assists - a.total_assists || (a.player_id < b.player_id ? -1 : 1))
      .slice(0, limit);

    return Response.json({ leaders, count: leaders.length, sport, division, organization_id: organizationId });
  } catch (error) {
    console.error('getTopAssistLeaders error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});