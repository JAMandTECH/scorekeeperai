import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function toISO(d) {
  return new Date(d).toISOString();
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function withinHours(dateA, dateB, hours = 24) {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(a - b) <= hours * 3600 * 1000;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Time window: last 7 days
    const windowStart = daysAgo(7);
    const windowEnd = new Date();

    // 1) Pull completed games (we'll filter by date/org in code)
    const allCompleted = await base44.entities.Game.filter({ status: 'completed' }, '-game_date', 500);

    const orgId = user.organization_id || user.active_organization_id || null;
    const weeklyGames = (allCompleted || []).filter((g) => {
      const gd = g.game_date || g.data?.game_date; // handle raw vs SDK-normalized
      const org = g.organization_id || g.data?.organization_id;
      const sport = g.sport || g.data?.sport;
      if (!gd) return false;
      const dt = new Date(gd);
      const inRange = dt >= windowStart && dt <= windowEnd;
      const orgMatch = orgId ? (org === orgId) : true;
      return inRange && orgMatch && (sport === 'basketball' || sport === 'volleyball');
    }).map((g) => ({
      id: g.id || g.data?.id,
      game_date: g.game_date || g.data?.game_date,
      organization_id: g.organization_id || g.data?.organization_id,
      home_team_id: g.home_team_id || g.data?.home_team_id,
      away_team_id: g.away_team_id || g.data?.away_team_id,
      sport: g.sport || g.data?.sport,
    }));

    // 2) Pull recent stats (limit to a reasonable number)
    // Prefer list by -created_date; fall back to -updated_date if needed
    let recentStats = [];
    try {
      recentStats = await base44.entities.PlayerGameStats.list('-created_date', 1000);
    } catch (_) {
      recentStats = await base44.entities.PlayerGameStats.list('-updated_date', 1000);
    }

    // Normalize stats records
    const normStats = (recentStats || []).map((s) => ({
      id: s.id,
      game_id: s.game_id || s.data?.game_id,
      team_id: s.team_id || s.data?.team_id,
      player_id: s.player_id || s.data?.player_id,
      created_date: s.created_date || s.data?.created_date,
      updated_date: s.updated_date || s.data?.updated_date,
    }));

    // Helper: fetch stats for a game directly
    async function fetchStatsForGame(gameId) {
      const res = await base44.entities.PlayerGameStats.filter({ game_id: gameId }, '-updated_date', 500);
      return (res || []).map((s) => ({ id: s.id, team_id: s.team_id || s.data?.team_id }));
    }

    // Group recent stats by their current game_id (potentially wrong IDs)
    const byGameId = normStats.reduce((acc, s) => {
      const key = s.game_id || 'unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});

    const report = [];
    let totalUpdates = 0;

    for (const game of weeklyGames) {
      const existing = await fetchStatsForGame(game.id);
      if (existing.length > 0) {
        report.push({ game_id: game.id, status: 'ok', message: 'Stats already linked', count: existing.length });
        continue;
      }

      // No stats linked: search for candidate orphan groups
      let chosenGroupKey = null;
      let chosenGroup = null;

      for (const [groupGameId, statsArr] of Object.entries(byGameId)) {
        if (!groupGameId || groupGameId === 'unknown') continue;

        // Teams present in this stats group
        const teamsSet = new Set(statsArr.map((s) => s.team_id).filter(Boolean));
        const hasHome = teamsSet.has(game.home_team_id);
        const hasAway = teamsSet.has(game.away_team_id);
        if (!hasHome && !hasAway) continue; // not related

        // Time proximity: check first stat timestamp vs game_date (or any stat)
        const anyStat = statsArr[0];
        const ts = anyStat.created_date || anyStat.updated_date;
        const closeInTime = ts ? withinHours(ts, game.game_date, 24) : true; // if missing timestamp, be permissive

        // Heuristic: allow if at least one team matches and time is close; prefer groups with both teams
        const teamScore = (hasHome ? 1 : 0) + (hasAway ? 1 : 0);
        if (!closeInTime) continue;

        if (!chosenGroup || teamScore > chosenGroup.teamScore || (teamScore === chosenGroup.teamScore && statsArr.length > (chosenGroup.statsArr?.length || 0))) {
          chosenGroup = { statsArr, teamScore };
          chosenGroupKey = groupGameId;
        }
      }

      if (!chosenGroupKey || !chosenGroup) {
        report.push({ game_id: game.id, status: 'not_found', message: 'No suitable orphan stats group found' });
        continue;
      }

      // Safety: do not re-link if the source group is actually the same game id
      if (chosenGroupKey === game.id) {
        report.push({ game_id: game.id, status: 'ok', message: 'Stats already linked (same group found)' });
        continue;
      }

      // Optional safety: if the source game id exists as a real Game and is completed, we still allow if teams match
      try {
        const srcGameId = chosenGroupKey;
        // try to fetch source game (ignore errors if not found)
        // SDK may not expose get; attempt filter by id
        const srcArr = await base44.entities.Game.filter({ id: srcGameId }, '-game_date', 1);
        const src = Array.isArray(srcArr) && srcArr.length ? srcArr[0] : null;
        if (src) {
          const srcHome = src.home_team_id || src.data?.home_team_id;
          const srcAway = src.away_team_id || src.data?.away_team_id;
          const sameTeams = (srcHome === game.home_team_id && srcAway === game.away_team_id) || (srcHome === game.away_team_id && srcAway === game.home_team_id);
          if (!sameTeams) {
            // If different matchup, skip to avoid corrupt re-links
            report.push({ game_id: game.id, status: 'skipped', message: `Found orphan stats under another game (${srcGameId}) but teams differ; manual review needed` });
            continue;
          }
        }
      } catch (_) {
        // ignore
      }

      // Perform updates: only for records whose team_id is either the home or away of target game
      const toMove = chosenGroup.statsArr.filter((s) => s.team_id === game.home_team_id || s.team_id === game.away_team_id);

      for (const s of toMove) {
        await base44.entities.PlayerGameStats.update(s.id, { game_id: game.id });
        totalUpdates += 1;
      }

      report.push({ game_id: game.id, status: 'relinked', from_game_id: chosenGroupKey, moved_count: toMove.length });
    }

    return Response.json({
      window: { start: toISO(windowStart), end: toISO(windowEnd) },
      organization_id: orgId,
      total_games_checked: weeklyGames.length,
      total_updates: totalUpdates,
      report,
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});