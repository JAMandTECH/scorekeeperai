import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Repairs historical games where the game score diverged from the stored
// player stats (the old bug where a player-stat write failed but the score
// still updated). Recalculates home_score/away_score as the sum of all
// PlayerGameStats points for the game — the same rule the live path now uses.
//
// Admin-only. Optional payload:
//   { organization_id?: string, dry_run?: boolean, max_games?: number }
// Returns a list of games whose scores were corrected.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin' && !user.is_super_admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { organization_id, dry_run = false, max_games = 60 } = body || {};

    // Only basketball games have point-based scores derived from player stats
    const query = { sport: 'basketball' };
    if (organization_id) query.organization_id = organization_id;

    const games = await base44.asServiceRole.entities.Game.filter(query, undefined, max_games);

    const corrected = [];
    let checked = 0;

    for (const game of (games || [])) {
      checked++;
      const stats = await base44.asServiceRole.entities.PlayerGameStats.filter(
        { game_id: game.id }, undefined, 2000
      );
      await sleep(250);

      // Skip games that have no stats at all — nothing to derive from,
      // don't wipe an existing score to zero.
      if (!stats || stats.length === 0) continue;

      let homeTotal = 0;
      let awayTotal = 0;
      for (const s of stats) {
        const pts = Number(s.points) || 0;
        if (s.team_id === game.home_team_id) homeTotal += pts;
        else if (s.team_id === game.away_team_id) awayTotal += pts;
      }

      const currentHome = Number(game.home_score) || 0;
      const currentAway = Number(game.away_score) || 0;

      if (homeTotal !== currentHome || awayTotal !== currentAway) {
        corrected.push({
          game_id: game.id,
          before: { home: currentHome, away: currentAway },
          after: { home: homeTotal, away: awayTotal },
        });
        if (!dry_run) {
          await base44.asServiceRole.entities.Game.update(game.id, {
            home_score: homeTotal,
            away_score: awayTotal,
          });
        }
      }
    }

    return Response.json({
      ok: true,
      dry_run,
      checked,
      corrected_count: corrected.length,
      corrected,
    });
  } catch (error) {
    console.error('repairGameScores error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});