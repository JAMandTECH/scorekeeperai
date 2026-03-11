import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Data Health Checks across organizations
// - Default: scans caller's organization (admin)
// - scope = 'all': scans ALL organizations (super admin only)
// - Ensures consistency for basketball & volleyball across any registered org
// Frontend usage: await base44.functions.invoke('runDataHealthChecks', { scope: 'all' | 'org' })
// Response shape adapts to scope: single-org returns detailed issues (capped), multi-org returns per-org summaries + aggregate counts

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Input
    const { scope = 'org', capSize = 50 } = await req.json().catch(() => ({ scope: 'org' }));

    const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
    const isAdmin = user?.role === 'admin';

    if (scope === 'all' && !isSuperAdmin) {
      return Response.json({ error: 'Forbidden: Super admin required for all-org scan' }, { status: 403 });
    }
    if (scope !== 'all' && !isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const orgIds = await (async () => {
      if (scope === 'all') {
        // Super admin: scan every organization
        const orgs = await base44.asServiceRole.entities.Organization.list();
        return orgs.map((o) => o.id);
      }
      const orgId = user.organization_id || user.active_organization_id;
      if (!orgId) throw new Error('No organization context found for user');
      return [orgId];
    })();

    const cap = (arr, n = capSize) => ({ items: arr.slice(0, n), more_count: Math.max(arr.length - n, 0) });

    // Reusable org scanner
    const scanOrg = async (orgId) => {
      // Load teams, players, games, stats
      const teams = await base44.asServiceRole.entities.Team.filter({ organization_id: orgId });
      const teamIds = teams.map((t) => t.id);
      const playersNested = await Promise.all(teamIds.map((id) => base44.asServiceRole.entities.Player.filter({ team_id: id }).catch(() => [])));
      const players = playersNested.flat();
      const games = await base44.asServiceRole.entities.Game.filter({ organization_id: orgId });

      const stats = [];
      const gameIds = games.map((g) => g.id);
      for (let i = 0; i < gameIds.length; i += 50) {
        const chunk = gameIds.slice(i, i + 50);
        try {
          const part = await base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: { $in: chunk } });
          stats.push(...part);
        } catch (_e) {
          const per = await Promise.all(chunk.map((id) => base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: id }).catch(() => [])));
          stats.push(...per.flat());
        }
      }

      const teamById = new Map(teams.map((t) => [t.id, t]));
      const playerById = new Map(players.map((p) => [p.id, p]));
      const gameById = new Map(games.map((g) => [g.id, g]));

      const missingRefs = [];
      const sportMismatches = [];
      const invalidValues = [];
      const scoreMismatches = [];
      const invalidGameFields = [];

      // Stat validations
      for (const s of stats) {
        const g = gameById.get(s.game_id);
        const p = playerById.get(s.player_id);
        const t = teamById.get(s.team_id);

        if (!g) missingRefs.push({ type: 'stat_game_missing', stat_id: s.id, game_id: s.game_id });
        if (!p) missingRefs.push({ type: 'stat_player_missing', stat_id: s.id, player_id: s.player_id });
        if (!t) missingRefs.push({ type: 'stat_team_missing', stat_id: s.id, team_id: s.team_id });

        if (s.quarter == null || Number(s.quarter) < 1) {
          invalidValues.push({ type: 'invalid_quarter', stat_id: s.id, quarter: s.quarter });
        }

        const numericKeys = [
          'points','rebounds','assists','steals','blocks','fouls','three_pointers',
          'field_goals_made','field_goals_attempted','free_throws_made','free_throws_attempted',
          'aces','attacks','rally_errors'
        ];
        for (const k of numericKeys) {
          const v = Number(s[k] ?? 0);
          if (Number.isNaN(v) || v < 0) invalidValues.push({ type: 'invalid_stat_value', key: k, value: s[k], stat_id: s.id });
        }

        if (g && t) {
          if (g.sport !== t.sport) {
            sportMismatches.push({ type: 'team_vs_game_sport', game_id: g.id, team_id: t.id, game_sport: g.sport, team_sport: t.sport });
          }
          if (g.sport === 'volleyball') {
            const bad = (Number(s.points||0) > 0) || (Number(s.three_pointers||0) > 0) || (Number(s.field_goals_made||0) > 0) || (Number(s.free_throws_made||0) > 0);
            if (bad) sportMismatches.push({ type: 'basketball_fields_on_volleyball_game', stat_id: s.id, game_id: g.id });
          }
          if (g.sport === 'basketball') {
            const bad = (Number(s.aces||0) > 0) || (Number(s.attacks||0) > 0) || (Number(s.rally_errors||0) > 0);
            if (bad) sportMismatches.push({ type: 'volleyball_fields_on_basketball_game', stat_id: s.id, game_id: g.id });
          }
        }
      }

      // Game validations
      for (const g of games) {
        if (g.home_timeouts != null && (g.home_timeouts < 0 || g.home_timeouts > 5)) invalidGameFields.push({ type: 'invalid_home_timeouts', game_id: g.id, value: g.home_timeouts });
        if (g.away_timeouts != null && (g.away_timeouts < 0 || g.away_timeouts > 5)) invalidGameFields.push({ type: 'invalid_away_timeouts', game_id: g.id, value: g.away_timeouts });
        if (!teamById.get(g.home_team_id)) missingRefs.push({ type: 'game_home_team_missing', game_id: g.id, team_id: g.home_team_id });
        if (!teamById.get(g.away_team_id)) missingRefs.push({ type: 'game_away_team_missing', game_id: g.id, team_id: g.away_team_id });
      }

      // Score consistency for completed games
      const computeTeamPoints = (game, teamId) => {
        const related = stats.filter((s) => s.game_id === game.id && s.team_id === teamId);
        if (game.sport === 'volleyball') {
          return related.reduce((sum, s) => sum + Number(s.aces||0) + Number(s.attacks||0) + Number(s.blocks||0), 0);
        }
        return related.reduce((sum, s) => {
          const stored = Number(s.points || 0);
          if (stored > 0) return sum + stored;
          const threes = Number(s.three_pointers || 0);
          const fgm = Number(s.field_goals_made || 0);
          const twos = Math.max(fgm - threes, 0);
          const ftm = Number(s.free_throws_made || 0);
          return sum + (twos * 2) + (threes * 3) + ftm;
        }, 0);
      };

      const completed = games.filter((g) => g.status === 'completed');
      for (const g of completed) {
        const homePts = computeTeamPoints(g, g.home_team_id);
        const awayPts = computeTeamPoints(g, g.away_team_id);
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

    // Execute scans (sequential to avoid heavy concurrent pressure; switch to limited parallel if needed)
    const results = [];
    for (const orgId of orgIds) {
      results.push(await scanOrg(orgId));
    }

    if (results.length === 1) {
      const r = results[0];
      return Response.json({ ok: true, scope: 'org', organization_id: r.orgId, summary: r.summary, issues: r.issues });
    }

    // Aggregate for multi-org
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
      per_org: results.map((r) => ({ organization_id: r.orgId, summary: r.summary }))
    });
  } catch (error) {
    console.error('runDataHealthChecks error:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});