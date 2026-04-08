import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Auto-fix safe data issues across organizations
// - scope: 'all' | 'org' (default 'all' requires super admin; 'org' requires admin)
// - org_limit: number (optional cap for 'all' scans to avoid timeouts; default 3)
// - dry_run: boolean (default false) — if true, only reports what would change
// Priorities addressed:
// 1) Player stats accuracy: sanitize invalid numeric values; quarter >= 1
// 2) Team standings: call recalcStandings after fixes per org
// 3) Games scheduling consistency: align game.sport and game.division to teams when unambiguous
// 4) Safe score fill: only set game.home_score/away_score when missing and derivable from stats/sets
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const scope = body.scope === 'org' ? 'org' : 'all';
    const orgLimit = Math.max(1, Math.min(Number(body.org_limit ?? 3), 50));
    const dryRun = Boolean(body.dry_run ?? false);

    const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
    const isAdmin = user?.role === 'admin';

    if (scope === 'all' && !isSuperAdmin) {
      return Response.json({ error: 'Forbidden: Super admin required for all-org auto-fix' }, { status: 403 });
    }
    if (scope === 'org' && !isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Resolve organization IDs
    let orgIds = [];
    if (scope === 'all') {
      const all = await base44.asServiceRole.entities.Organization.list();
      orgIds = all.map(o => o.id).slice(0, orgLimit);
    } else {
      const orgId = user.organization_id || user.active_organization_id;
      if (!orgId) return Response.json({ error: 'No organization context found for user' }, { status: 400 });
      orgIds = [orgId];
    }

    const aggregate = {
      scanned_orgs: orgIds.length,
      org_summaries: [],
      totals: {
        games_sport_fixed: 0,
        games_division_fixed: 0,
        scores_filled: 0,
        stat_records_sanitized: 0,
        standings_recalculated: 0,
      },
    };

    // Helper: compute team points from stats (basketball) or volleyball derived points
    const computeTeamPoints = (game, stats) => {
      if (game.sport === 'volleyball') {
        // Prefer set totals from quarter_scores if present; otherwise sum volleyball stat proxies
        if (Array.isArray(game.quarter_scores) && game.quarter_scores.length > 0) {
          let h = 0, a = 0;
          for (const s of game.quarter_scores) { h += Number(s?.home || 0); a += Number(s?.away || 0); }
          return { home: h, away: a, derived: 'sets' };
        }
        const byTeam = new Map();
        for (const s of stats) {
          const add = Number(s.aces||0) + Number(s.attacks||0) + Number(s.blocks||0);
          byTeam.set(s.team_id, (byTeam.get(s.team_id) || 0) + add);
        }
        return { home: byTeam.get(game.home_team_id) || 0, away: byTeam.get(game.away_team_id) || 0, derived: 'vb_stats' };
      }
      // basketball
      const byTeam = new Map();
      for (const s of stats) {
        const stored = Number(s.points || 0);
        let pts = stored;
        if (!stored || stored <= 0) {
          const threes = Number(s.three_pointers || 0);
          const fgm = Number(s.field_goals_made || 0);
          const twos = Math.max(fgm - threes, 0);
          const ftm = Number(s.free_throws_made || 0);
          pts = (twos * 2) + (threes * 3) + ftm;
        }
        byTeam.set(s.team_id, (byTeam.get(s.team_id) || 0) + pts);
      }
      return { home: byTeam.get(game.home_team_id) || 0, away: byTeam.get(game.away_team_id) || 0, derived: 'bb_stats' };
    };

    for (const orgId of orgIds) {
      const orgSummary = {
        organization_id: orgId,
        games_sport_fixed: 0,
        games_division_fixed: 0,
        scores_filled: 0,
        stat_records_sanitized: 0,
        standings_recalculated: 0,
      };

      // Load org data
      const teams = await base44.asServiceRole.entities.Team.filter({ organization_id: orgId });
      const teamById = new Map(teams.map(t => [t.id, t]));
      const games = await base44.asServiceRole.entities.Game.filter({ organization_id: orgId });

      // 1) Game-level safe fixes: sport & division alignment
      const gameUpdatePromises = [];
      for (const g of games) {
        const home = teamById.get(g.home_team_id);
        const away = teamById.get(g.away_team_id);
        if (!home || !away) continue;

        const updates = {};
        // sport alignment only if both teams share same sport and differs from game
        const homeSport = String(home.sport || '').toLowerCase();
        const awaySport = String(away.sport || '').toLowerCase();
        if (homeSport && awaySport && homeSport === awaySport) {
          if (String(g.sport || '').toLowerCase() !== homeSport) {
            updates.sport = homeSport;
          }
        }

        // division alignment only if both teams share same non-empty division
        const homeDiv = String(home.division || '').trim();
        const awayDiv = String(away.division || '').trim();
        if (homeDiv && awayDiv && homeDiv.toLowerCase() === awayDiv.toLowerCase()) {
          if (String(g.division || '').trim().toLowerCase() !== homeDiv.toLowerCase()) {
            updates.division = homeDiv;
          }
        }

        if (Object.keys(updates).length > 0) {
          if (!dryRun) gameUpdatePromises.push(base44.asServiceRole.entities.Game.update(g.id, updates));
          if (updates.sport) { orgSummary.games_sport_fixed++; }
          if (updates.division) { orgSummary.games_division_fixed++; }
        }
      }
      if (gameUpdatePromises.length) await Promise.all(gameUpdatePromises);

      // 2) Stats sanitization and safe score fill
      const gameIds = games.map(g => g.id);
      const statsByGame = new Map();
      // Fetch stats by game_id in chunks
      for (let i = 0; i < gameIds.length; i += 50) {
        const chunk = gameIds.slice(i, i + 50);
        try {
          const part = await base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: { $in: chunk } });
          for (const s of part) {
            const arr = statsByGame.get(s.game_id) || [];
            arr.push(s);
            statsByGame.set(s.game_id, arr);
          }
        } catch (_e) {
          const per = await Promise.all(
            chunk.map(id => base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: id }).catch(() => []))
          );
          for (const arr of per) {
            for (const s of arr) {
              const a = statsByGame.get(s.game_id) || [];
              a.push(s);
              statsByGame.set(s.game_id, a);
            }
          }
        }
      }

      // Sanitize stats (non-negative numeric; ensure quarter >= 1)
      const numericKeys = ['points','rebounds','assists','steals','blocks','fouls','three_pointers','field_goals_made','field_goals_attempted','free_throws_made','free_throws_attempted','aces','attacks','rally_errors'];
      const statUpdatePromises = [];
      for (const [gid, arr] of statsByGame.entries()) {
        for (const s of arr) {
          const patch = {};
          let changed = false;
          for (const k of numericKeys) {
            const v = Number(s[k] ?? 0);
            if (!Number.isFinite(v) || v < 0) { patch[k] = 0; changed = true; }
          }
          const q = Number(s.quarter ?? 1);
          if (!Number.isFinite(q) || q < 1) { patch.quarter = 1; changed = true; }
          if (changed) {
            if (!dryRun) statUpdatePromises.push(base44.asServiceRole.entities.PlayerGameStats.update(s.id, patch));
            orgSummary.stat_records_sanitized++;
          }
        }
      }
      if (statUpdatePromises.length) await Promise.all(statUpdatePromises);

      // Fill missing final scores when derivable (safe-only)
      const scoreUpdatePromises = [];
      for (const g of games) {
        if (String(g.status) !== 'completed') continue;
        const stats = statsByGame.get(g.id) || [];
        if (stats.length === 0) continue; // do not modify if no stats loaded

        const curHome = g.home_score;
        const curAway = g.away_score;
        const missingHome = curHome == null;
        const missingAway = curAway == null;
        if (!missingHome && !missingAway) continue; // only fill missing values

        const { home: compH, away: compA } = computeTeamPoints(g, stats);
        const updates = {};
        if (missingHome) updates.home_score = compH;
        if (missingAway) updates.away_score = compA;
        if (Object.keys(updates).length > 0) {
          if (!dryRun) scoreUpdatePromises.push(base44.asServiceRole.entities.Game.update(g.id, updates));
          orgSummary.scores_filled++;
        }
      }
      if (scoreUpdatePromises.length) await Promise.all(scoreUpdatePromises);

      // 3) Recalculate standings using existing function
      if (!dryRun) {
        try {
          await base44.functions.invoke('recalcStandings', { organization_id: orgId });
          orgSummary.standings_recalculated = 1;
        } catch (_e) {
          // Fallback: skip if function not available or auth blocked
          orgSummary.standings_recalculated = 0;
        }
      }

      // Push org summary and update aggregate totals
      aggregate.org_summaries.push(orgSummary);
      aggregate.totals.games_sport_fixed += orgSummary.games_sport_fixed;
      aggregate.totals.games_division_fixed += orgSummary.games_division_fixed;
      aggregate.totals.scores_filled += orgSummary.scores_filled;
      aggregate.totals.stat_records_sanitized += orgSummary.stat_records_sanitized;
      aggregate.totals.standings_recalculated += orgSummary.standings_recalculated;
    }

    return Response.json({ ok: true, scope, dry_run: dryRun, ...aggregate });
  } catch (error) {
    console.error('autoFixDataIntegrity error:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});