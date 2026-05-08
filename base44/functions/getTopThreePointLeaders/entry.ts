import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function fetchWithRetry(base44, filter, attempt = 1) {
  try { return await base44.asServiceRole.entities.PlayerGameStats.filter(filter); } catch (err) {
    const msg = String(err?.message || '');
    if (/429|rate limit/i.test(msg) && attempt < 6) {
      await sleep(250 * Math.pow(2, attempt - 1));
      return fetchWithRetry(base44, filter, attempt + 1);
    }
    throw err;
  }
}
async function fetchPlayerStatsForGames(base44, gameIds) {
  const ids = Array.from(new Set((gameIds || []).filter(Boolean)));
  const results = [];
  for (let i = 0; i < ids.length; i += 25) {
    const chunk = ids.slice(i, i + 25);
    let chunkResults = null;
    try { chunkResults = await fetchWithRetry(base44, { game_id: { $in: chunk } }); } catch (_) { chunkResults = null; }
    if (!Array.isArray(chunkResults)) {
      for (let j = 0; j < chunk.length; j += 3) {
        const batch = chunk.slice(j, j + 3);
        const batchResults = await Promise.all(batch.map((gameId) => fetchWithRetry(base44, { game_id: gameId }).catch(() => [])));
        results.push(...batchResults.flat());
        if (j + 3 < chunk.length) await sleep(300);
      }
    } else results.push(...chunkResults);
    if (i + 25 < ids.length) await sleep(200);
  }
  return results;
}
async function fetchPlayersForTeams(base44, teamIds) {
  const ids = Array.from(new Set((teamIds || []).filter(Boolean)));
  const players = [];
  for (let i = 0; i < ids.length; i += 3) {
    const batch = ids.slice(i, i + 3);
    const batchResults = await Promise.all(batch.map((teamId) => base44.asServiceRole.entities.Player.filter({ team_id: teamId }).catch(() => [])));
    players.push(...batchResults.flat());
    if (i + 3 < ids.length) await sleep(250);
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
    const [teamsRaw, gamesRaw] = await Promise.all([
      organizationId ? base44.asServiceRole.entities.Team.filter({ organization_id: organizationId }) : base44.asServiceRole.entities.Team.list(),
      organizationId ? base44.asServiceRole.entities.Game.filter({ organization_id: organizationId, status: 'completed' }) : base44.asServiceRole.entities.Game.filter({ status: 'completed' })
    ]);
    const teams = (teamsRaw || []).filter((t) => String(t.sport || '').toLowerCase() === sport && (!division || String(t.division || '').toLowerCase() === division));
    const teamMapAll = new Map((teamsRaw || []).map((t) => [t.id, t]));
    const games = (gamesRaw || []).filter((g) => {
      if (String(g.sport || '').toLowerCase() !== sport) return false;
      if (!division) return true;
      const homeDivision = String(teamMapAll.get(g.home_team_id)?.division || '').toLowerCase();
      const awayDivision = String(teamMapAll.get(g.away_team_id)?.division || '').toLowerCase();
      return homeDivision === division || awayDivision === division;
    });
    if (!teams.length || !games.length) return Response.json({ leaders: [], count: 0, sport, division, organization_id: organizationId });
    const teamIds = teams.map((t) => t.id);
    const teamIdSet = new Set(teamIds);
    const allStats = await fetchPlayerStatsForGames(base44, games.map((g) => g.id));
    const teamMap = new Map(teams.map((t) => [t.id, t]));
    const players = await fetchPlayersForTeams(base44, teamIds);
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const agg = new Map();
    for (const s of allStats) {
      const pid = s.player_id;
      if (!pid || !playerMap.has(pid) || !teamIdSet.has(s.team_id)) continue;
      const add = Number(s.three_pointers || 0);
      if (!agg.has(pid)) agg.set(pid, { total: 0, games: new Set() });
      const rec = agg.get(pid);
      rec.total += add;
      rec.games.add(s.game_id);
    }
    const leaders = Array.from(agg.entries()).map(([playerId, { total, games }]) => {
      const player = playerMap.get(playerId) || {};
      const team = teamMap.get(player.team_id) || {};
      const gamesPlayed = games.size;
      return { player_id: playerId, first_name: player.first_name, last_name: player.last_name, jersey_number: player.jersey_number || '', team_id: player.team_id, team_name: team.name || 'Unknown', team_logo_url: team.logo_url || '', total, games_played: gamesPlayed, average: gamesPlayed > 0 ? Number((total / gamesPlayed).toFixed(1)) : 0, average_label: '3PG', photo_url: player.photo_url || '' };
    }).filter((p) => p.total > 0).sort((a, b) => b.total - a.total).slice(0, limit);
    return Response.json({ leaders, count: leaders.length, sport, division, organization_id: organizationId });
  } catch (error) {
    console.error('getTopThreePointLeaders error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});