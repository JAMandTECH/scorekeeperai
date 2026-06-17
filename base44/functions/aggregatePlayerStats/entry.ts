import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(fn, attempt = 1) {
  try {
    return await fn();
  } catch (err) {
    const msg = String(err?.message || '');
    const isRateLimited = /429|rate limit/i.test(msg);
    if (isRateLimited && attempt < 9) {
      await sleep(600 * Math.pow(2, attempt - 1));
      return fetchWithRetry(fn, attempt + 1);
    }
    throw err;
  }
}

// Fetch all PlayerGameStats for a chunk of game ids
async function fetchStatsForGames(base44, gameIds) {
  const ids = Array.from(new Set((gameIds || []).filter(Boolean)));
  const results = [];
  for (let i = 0; i < ids.length; i += 25) {
    const chunk = ids.slice(i, i + 25);
    let chunkResults = [];
    try {
      chunkResults = await fetchWithRetry(() =>
        base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: { $in: chunk } })
      );
    } catch (_) {
      chunkResults = [];
    }
    if (Array.isArray(chunkResults) && chunkResults.length) {
      results.push(...chunkResults);
    }
    if (i + 25 < ids.length) await sleep(150);
  }
  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin / service-role only
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let payload = {};
    try { payload = await req.json(); } catch (_) { payload = {}; }

    const organizationId = payload.organization_id || user.organization_id || user.active_organization_id || null;
    // Optional: only process specific games (used by the automation). If omitted, process ALL completed games (backfill).
    const targetGameIds = Array.isArray(payload.game_ids) ? payload.game_ids.filter(Boolean) : null;
    // Optional cap for resumable backfills: only process up to N not-yet-counted games per call.
    const maxGames = Number(payload.max_games) > 0 ? Number(payload.max_games) : null;

    if (!organizationId) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    // Load teams (for sport + team mapping) and completed games for this org
    const [teamsRaw, gamesRaw] = await Promise.all([
      fetchWithRetry(() => base44.asServiceRole.entities.Team.filter({ organization_id: organizationId })),
      fetchWithRetry(() => base44.asServiceRole.entities.Game.filter({ organization_id: organizationId, status: 'completed' }))
    ]);

    const teams = teamsRaw || [];
    const teamMap = new Map(teams.map((t) => [t.id, t]));

    let games = (gamesRaw || []);
    if (targetGameIds) {
      const wanted = new Set(targetGameIds);
      games = games.filter((g) => wanted.has(g.id));
    }

    if (!games.length) {
      return Response.json({ ok: true, processed_games: 0, updated_players: 0, organization_id: organizationId });
    }

    // Load existing season records for this org once (small table = fast)
    const existingRecords = await fetchWithRetry(() =>
      base44.asServiceRole.entities.PlayerSeasonStats.filter({ organization_id: organizationId })
    );
    // key: `${player_id}|${sport}`
    const recordMap = new Map();
    const alreadyCounted = new Set();
    for (const r of (existingRecords || [])) {
      recordMap.set(`${r.player_id}|${r.sport}`, r);
      for (const gid of (r.counted_game_ids || [])) alreadyCounted.add(gid);
    }

    // Only process games not yet fully counted. Apply optional cap for resumable backfills.
    // Sort by id for a stable order so offset-based paging is deterministic across calls.
    let pendingGames = games.filter((g) => !alreadyCounted.has(g.id)).sort((a, b) => (a.id < b.id ? -1 : 1));
    const remainingBefore = pendingGames.length;
    const offset = Number(payload.offset) > 0 ? Number(payload.offset) : 0;
    if (maxGames) pendingGames = pendingGames.slice(offset, offset + maxGames);
    else if (offset) pendingGames = pendingGames.slice(offset);

    if (!pendingGames.length) {
      return Response.json({ ok: true, processed_games: 0, updated_players: 0, remaining_games: 0, organization_id: organizationId });
    }

    const gameSportMap = new Map(games.map((g) => [g.id, String(g.sport || '').toLowerCase()]));
    const gameIds = pendingGames.map((g) => g.id);

    // Pull all stats for the pending games only
    const allStats = await fetchStatsForGames(base44, gameIds);

    // Build per-player aggregation deltas from stats that are NOT yet counted
    // accumulator key: `${player_id}|${sport}`
    const acc = new Map();

    for (const s of allStats) {
      const pid = s.player_id;
      const gid = s.game_id;
      if (!pid || !gid) continue;
      const sport = gameSportMap.get(gid);
      if (sport !== 'basketball' && sport !== 'volleyball') continue;

      const key = `${pid}|${sport}`;
      const existing = recordMap.get(key);
      // Skip if this game is already counted in the existing record
      if (existing && Array.isArray(existing.counted_game_ids) && existing.counted_game_ids.includes(gid)) {
        continue;
      }

      if (!acc.has(key)) {
        const team = teamMap.get(s.team_id);
        acc.set(key, {
          player_id: pid,
          sport,
          team_id: s.team_id || (existing ? existing.team_id : null),
          games: new Set(),
          totals: {
            total_points: 0, total_rebounds: 0, total_assists: 0,
            total_steals: 0, total_blocks: 0, total_three_pointers: 0,
            total_aces: 0, total_attacks: 0
          }
        });
      }
      const a = acc.get(key);
      a.games.add(gid);
      a.totals.total_points += Number(s.points || 0);
      a.totals.total_rebounds += Number(s.rebounds || 0);
      a.totals.total_assists += Number(s.assists || 0);
      a.totals.total_steals += Number(s.steals || 0);
      a.totals.total_blocks += Number(s.blocks || 0);
      a.totals.total_three_pointers += Number(s.three_pointers || 0);
      a.totals.total_aces += Number(s.aces || 0);
      a.totals.total_attacks += Number(s.attacks || 0);
      if (!a.team_id && s.team_id) a.team_id = s.team_id;
    }

    let updatedPlayers = 0;
    const nowIso = new Date().toISOString();

    for (const [key, a] of acc.entries()) {
      const existing = recordMap.get(key);
      const newGameIds = Array.from(a.games);
      if (existing) {
        const mergedGameIds = Array.from(new Set([...(existing.counted_game_ids || []), ...newGameIds]));
        await fetchWithRetry(() =>
          base44.asServiceRole.entities.PlayerSeasonStats.update(existing.id, {
            team_id: a.team_id || existing.team_id,
            games_played: mergedGameIds.length,
            total_points: Number(existing.total_points || 0) + a.totals.total_points,
            total_rebounds: Number(existing.total_rebounds || 0) + a.totals.total_rebounds,
            total_assists: Number(existing.total_assists || 0) + a.totals.total_assists,
            total_steals: Number(existing.total_steals || 0) + a.totals.total_steals,
            total_blocks: Number(existing.total_blocks || 0) + a.totals.total_blocks,
            total_three_pointers: Number(existing.total_three_pointers || 0) + a.totals.total_three_pointers,
            total_aces: Number(existing.total_aces || 0) + a.totals.total_aces,
            total_attacks: Number(existing.total_attacks || 0) + a.totals.total_attacks,
            counted_game_ids: mergedGameIds,
            last_aggregated_at: nowIso
          })
        );
      } else {
        await fetchWithRetry(() =>
          base44.asServiceRole.entities.PlayerSeasonStats.create({
            organization_id: organizationId,
            player_id: a.player_id,
            team_id: a.team_id || null,
            sport: a.sport,
            games_played: newGameIds.length,
            ...a.totals,
            counted_game_ids: newGameIds,
            last_aggregated_at: nowIso
          })
        );
      }
      updatedPlayers += 1;
      await sleep(50);
    }

    return Response.json({
      ok: true,
      processed_games: pendingGames.length,
      updated_players: updatedPlayers,
      remaining_games: Math.max(0, remainingBefore - pendingGames.length),
      organization_id: organizationId
    });
  } catch (error) {
    console.error('aggregatePlayerStats error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});