import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

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

// Full rebuild of PlayerSeasonStats from raw PlayerGameStats.
// Recomputes every player's totals from scratch so the Statistics view
// matches the Dashboard's live-computed leaders.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const organizationId = body.organization_id || user.organization_id || user.active_organization_id;
    if (!organizationId) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    const [teamsRaw, gamesRaw, existingRaw] = await Promise.all([
      fetchWithRetry(() => base44.asServiceRole.entities.Team.filter({ organization_id: organizationId })),
      fetchWithRetry(() => base44.asServiceRole.entities.Game.filter({ organization_id: organizationId, status: 'completed' })),
      fetchWithRetry(() => base44.asServiceRole.entities.PlayerSeasonStats.filter({ organization_id: organizationId })),
    ]);

    const teams = teamsRaw || [];
    const teamMap = new Map(teams.map((t) => [t.id, t]));
    const games = gamesRaw || [];
    const gameSportMap = new Map(games.map((g) => [g.id, String(g.sport || '').toLowerCase()]));

    // Fetch ALL PlayerGameStats for this org's completed games (chunked)
    const gameIds = games.map((g) => g.id);
    const allStats = [];
    for (let i = 0; i < gameIds.length; i += 25) {
      const chunk = gameIds.slice(i, i + 25);
      try {
        const part = await fetchWithRetry(() =>
          base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: { $in: chunk } })
        );
        if (Array.isArray(part) && part.length) allStats.push(...part);
      } catch (_) { /* skip chunk */ }
      if (i + 25 < gameIds.length) await sleep(120);
    }

    // Recompute per-player totals from scratch
    // key: `${player_id}|${sport}`
    const acc = new Map();
    for (const s of allStats) {
      const pid = s.player_id;
      const gid = s.game_id;
      if (!pid || !gid) continue;
      const sport = gameSportMap.get(gid);
      if (sport !== 'basketball' && sport !== 'volleyball') continue;

      const key = `${pid}|${sport}`;
      if (!acc.has(key)) {
        acc.set(key, {
          player_id: pid,
          sport,
          team_id: s.team_id || null,
          games: new Set(),
          totals: {
            total_points: 0, total_rebounds: 0, total_assists: 0,
            total_steals: 0, total_blocks: 0, total_three_pointers: 0,
            total_aces: 0, total_attacks: 0,
          },
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

    // Index existing records by player|sport for in-place updates
    const existingMap = new Map();
    for (const r of (existingRaw || [])) {
      existingMap.set(`${r.player_id}|${r.sport}`, r);
    }

    const nowIso = new Date().toISOString();
    let updated = 0;
    let created = 0;
    let unchanged = 0;

    for (const [key, a] of acc.entries()) {
      const gameIdsList = Array.from(a.games);
      const existing = existingMap.get(key);

      const payload = {
        team_id: a.team_id || (existing ? existing.team_id : null),
        games_played: gameIdsList.length,
        ...a.totals,
        counted_game_ids: gameIdsList,
        last_aggregated_at: nowIso,
      };

      if (existing) {
        // Overwrite with freshly recomputed values
        await fetchWithRetry(() =>
          base44.asServiceRole.entities.PlayerSeasonStats.update(existing.id, payload)
        );
        updated += 1;
      } else {
        await fetchWithRetry(() =>
          base44.asServiceRole.entities.PlayerSeasonStats.create({
            organization_id: organizationId,
            player_id: a.player_id,
            sport: a.sport,
            ...payload,
          })
        );
        created += 1;
      }
      await sleep(40);
    }

    return Response.json({
      ok: true,
      organization_id: organizationId,
      completed_games: games.length,
      stat_rows_scanned: allStats.length,
      players_recomputed: acc.size,
      records_updated: updated,
      records_created: created,
    });
  } catch (error) {
    console.error('rebuildPlayerSeasonStats error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}