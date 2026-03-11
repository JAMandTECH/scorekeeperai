import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Data Health Checks across organizations
// Modes:
//  - scope='org' (admin): full scan for caller's org (all games & stats)
//  - scope='all' (super admin): quick, paginated scan across many orgs with light checks + sampled games
// Params:
//  - scope: 'org' | 'all'
//  - offset, limit (for scope='all')
//  - mode: 'quick' | 'full' (full allowed only for scope='org')
//  - sampleGamesPerOrg: number (default 5, only for quick/all)
//  - capSize: number (max items returned per issue list; default 50)

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const scope = body.scope === 'all' ? 'all' : 'org';
    const mode = body.mode || (scope === 'all' ? 'quick' : 'full');
    const capSize = Number(body.capSize ?? 50);
    const sampleGamesPerOrg = Math.max(0, Math.min(Number(body.sampleGamesPerOrg ?? 5), 50));
    const offset = Number(body.offset ?? 0);
    const limit = Math.max(1, Math.min(Number(body.limit ?? 5), 25)); // keep low to avoid timeouts

    const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
    const isAdmin = user?.role === 'admin';

    if (scope === 'all' && !isSuperAdmin) {
      return Response.json({ error: 'Forbidden: Super admin required for all-org scan' }, { status: 403 });
    }
    if (scope !== 'all' && !isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const cap = (arr, n = capSize) => ({ items: arr.slice(0, n), more_count: Math.max(arr.length - n, 0) });

    // Utilities
    const computeTeamPoints = (game, relatedStats) => {
      if (game.sport === 'volleyball') {
        return relatedStats.reduce((sum, s) => sum + Number(s.aces||0) + Number(s.attacks||0) + Number(s.blocks||0), 0);
      }
      return relatedStats.reduce((sum, s) => {
        const stored = Number(s.points || 0);
        if (stored > 0) return sum + stored;
        const threes = Number(s.three_pointers || 0);
        const fgm = Number(s.field_goals_made || 0);
        const twos = Math.max(fgm - threes, 0);
        const ftm = Number(s.free_throws_made || 0);
        return sum + (twos * 2) + (threes * 3) + ftm;
      }, 0);
    };

    // Org scanner (full)
    const scanOrgFull = async (orgId) => {
      const teams = await base44.asServiceRole.entities.Team.filter({ organization_id: orgId });
      const games = await base44.asServiceRole.entities.Game.filter({ organization_id: orgId });
      const teamIds = teams.map(t => t.id);
      const playersNested = await Promise.all(teamIds.map(id => base44.asServiceRole.entities.Player.filter({ team_id: id }).catch(() => [])));
      const players = playersNested.flat();

      // All stats for all games (chunked)
      const stats = [];
      const gameIds = games.map(g => g.id);
      for (let i = 0; i < gameIds.length; i += 50) {
        const chunk = gameIds.slice(i, i + 50);
        try {
          const part = await base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: { $in: chunk } });
          stats.push(...part);
        } catch (_e) {
          const per = await Promise.all(chunk.map(id => base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: id }).catch(() => [])));
          stats.push(...per.flat());
        }
      }

      return evaluateOrg(orgId, teams, games, players, stats);
    };

    // Org scanner (quick) for ALL: minimal + sampled stats
    const scanOrgQuick = async (orgId) => {
      const teams = await base44.asServiceRole.entities.Team.filter({ organization_id: orgId });
      const games = await base44.asServiceRole.entities.Game.filter({ organization_id: orgId });
      const players = []; // not needed for quick checks

      let stats = [];
      if (sampleGamesPerOrg > 0) {
        const completed = games.filter(g => g.status === 'completed');
        const sampled = completed.slice(0, sampleGamesPerOrg);
        const ids = sampled.map(g => g.id);
        for (let i = 0; i < ids.length; i += 25) {
          const chunk = ids.slice(i, i + 25);
          try {
            const part = await base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: { $in: chunk } });
            stats.push(...part);
          } catch (_e) {
            const per = await Promise.all(chunk.map(id => base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: id }).catch(() => [])));
            stats.push(...per.flat());
          }
        }
      }

      // Evaluate, but keep counts correct and issues from sampled stats only
      return evaluateOrg(orgId, teams, games, players, stats, { sampled: true });
    };

    // Evaluation shared logic
    const evaluateOrg = (orgId, teams, games, players, stats, opts = {}) => {
      const teamById = new Map(teams.map(t => [t.id, t]));
      const gameById = new Map(games.map(g => [g.id, g]));

      const missingRefs = [];
      const sportMismatches = [];
      const invalidValues = [];
      const scoreMismatches = [];
      const invalidGameFields = [];

      // Game validations independent of stats
      for (const g of games) {
        if (g.home_timeouts != null && (g.home_timeouts < 0 || g.home_timeouts > 5)) invalidGameFields.push({ type: 'invalid_home_timeouts', game_id: g.id, value: g.home_timeouts });
        if (g.away_timeouts != null && (g.away_timeouts < 0 || g.away_timeouts > 5)) invalidGameFields.push({ type: 'invalid_away_timeouts', game_id: g.id, value: g.away_timeouts });
        const homeTeam = teamById.get(g.home_team_id);
        const awayTeam = teamById.get(g.away_team_id);
        if (!homeTeam) missingRefs.push({ type: 'game_home_team_missing', game_id: g.id, team_id: g.home_team_id });
        if (!awayTeam) missingRefs.push({ type: 'game_away_team_missing', game_id: g.id, team_id: g.away_team_id });
        if (homeTeam && g.sport !== homeTeam.sport) sportMismatches.push({ type: 'team_vs_game_sport', side: 'home', game_id: g.id, team_id: homeTeam.id, game_sport: g.sport, team_sport: homeTeam.sport });
        if (awayTeam && g.sport !== awayTeam.sport) sportMismatches.push({ type: 'team_vs_game_sport', side: 'away', game_id: g.id, team_id: awayTeam.id, game_sport: g.sport, team_sport: awayTeam.sport });
      }

      // Stat validations (full for scope='org', sampled for scope='all')
      const gameStatsByKey = new Map(); // `${game_id}:${team_id}` -> stats[]
      for (const s of stats) {
        const g = gameById.get(s.game_id);
        if (!g) missingRefs.push({ type: 'stat_game_missing', stat_id: s.id, game_id: s.game_id });
        if (s.quarter == null || Number(s.quarter) < 1) invalidValues.push({ type: 'invalid_quarter', stat_id: s.id, quarter: s.quarter });

        const numericKeys = ['points','rebounds','assists','steals','blocks','fouls','three_pointers','field_goals_made','field_goals_attempted','free_throws_made','free_throws_attempted','aces','attacks','rally_errors'];
        for (const k of numericKeys) {
          const v = Number(s[k] ?? 0);
          if (Number.isNaN(v) || v < 0) invalidValues.push({ type: 'invalid_stat_value', key: k, value: s[k], stat_id: s.id });
        }

        if (g) {
          if (g.sport === 'volleyball') {
            const bad = (Number(s.points||0) > 0) || (Number(s.three_pointers||0) > 0) || (Number(s.field_goals_made||0) > 0) || (Number(s.free_throws_made||0) > 0);
            if (bad) sportMismatches.push({ type: 'basketball_fields_on_volleyball_game', stat_id: s.id, game_id: g.id });
          } else if (g.sport === 'basketball') {
            const bad = (Number(s.aces||0) > 0) || (Number(s.attacks||0) > 0) || (Number(s.rally_errors||0) > 0);
            if (bad) sportMismatches.push({ type: 'volleyball_fields_on_basketball_game', stat_id: s.id, game_id: g.id });
          }
          const key = `${s.game_id}:${s.team_id}`;
          const arr = gameStatsByKey.get(key) || [];
          arr.push(s);
          gameStatsByKey.set(key, arr);
        }
      }

      // Score consistency for games that have stats loaded (full or sampled)
      const withStatsIds = new Set(Array.from(gameStatsByKey.keys()).map(k => k.split(':')[0]));
      for (const g of games) {
        if (g.status !== 'completed') continue;
        if (!withStatsIds.has(g.id)) {
          if (!opts.sampled) {
            // In full mode we expect stats; flag missing if none
            scoreMismatches.push({ game_id: g.id, sport: g.sport, note: 'no_stats_loaded_for_completed_game' });
          }
          continue;
        }
        const homeStats = gameStatsByKey.get(`${g.id}:${g.home_team_id}`) || [];
        const awayStats = gameStatsByKey.get(`${g.id}:${g.away_team_id}`) || [];
        const homePts = computeTeamPoints(g, homeStats);
        const awayPts = computeTeamPoints(g, awayStats);
        if (homePts !== Number(g.home_score || 0) || awayPts !== Number(g.away_score || 0)) {
          scoreMismatches.push({ game_id: g.id, sport: g.sport, expected_home: g.home_score || 0, expected_away: g.away_score || 0, computed_home: homePts, computed_away: awayPts });
        }
      }

      const summary = {
        organization_id: orgId,
        counts: { teams: teams.length, players: players.length, games: games.length, stats: stats.length },
        issues_count: {
          missing_references: missingRefs.length,
          sport_mismatches: sportMismatches.length,
          invalid_values: invalidValues.length,
          invalid_game_fields: invalidGameFields.length,
          score_mismatches: scoreMismatches.length,
        },
      };

      return {
        orgId,
        summary,
        issues: {
          missing_references: cap(missingRefs),
          sport_mismatches: cap(sportMismatches),
          invalid_values: cap(invalidValues),
          invalid_game_fields: cap(invalidGameFields),
          score_mismatches: cap(scoreMismatches),
        },
      };
    };

    // Resolve org IDs
    let orgIds = [];
    let total = 0;
    if (scope === 'all') {
      const all = await base44.asServiceRole.entities.Organization.list();
      total = all.length;
      orgIds = all.slice(offset, offset + limit).map(o => o.id);
    } else {
      const orgId = user.organization_id || user.active_organization_id;
      if (!orgId) return Response.json({ error: 'No organization context found for user' }, { status: 400 });
      orgIds = [orgId];
      total = 1;
    }

    const results = [];
    for (const orgId of orgIds) {
      const r = scope === 'all' && mode === 'quick' ? await scanOrgQuick(orgId) : await scanOrgFull(orgId);
      results.push(r);
    }

    if (scope === 'org') {
      const r = results[0];
      return Response.json({ ok: true, scope: 'org', organization_id: r.orgId, summary: r.summary, issues: r.issues });
    }

    // Aggregate for multi-org quick scan
    const aggregate = {
      total_orgs: results.length,
      counts: { teams: 0, players: 0, games: 0, stats: 0 },
      issues_count: { missing_references: 0, sport_mismatches: 0, invalid_values: 0, invalid_game_fields: 0, score_mismatches: 0 },
    };
    for (const r of results) {
      aggregate.counts.teams += r.summary.counts.teams;
      aggregate.counts.players += r.summary.counts.players;
      aggregate.counts.games += r.summary.counts.games;
      aggregate.counts.stats += r.summary.counts.stats;
      aggregate.issues_count.missing_references += r.summary.issues_count.missing_references;
      aggregate.issues_count.sport_mismatches += r.summary.issues_count.sport_mismatches;
      aggregate.issues_count.invalid_values += r.summary.issues_count.invalid_values;
      aggregate.issues_count.invalid_game_fields += r.summary.issues_count.invalid_game_fields;
      aggregate.issues_count.score_mismatches += r.summary.issues_count.score_mismatches;
    }

    return Response.json({
      ok: true,
      scope: 'all',
      aggregate,
      per_org: results.map(r => ({ organization_id: r.orgId, summary: r.summary })),
      pagination: { offset, limit, scanned: results.length, total, has_more: offset + results.length < total }
    });
  } catch (error) {
    console.error('runDataHealthChecks error:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});