import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// finalizePeriodStats
// Purpose: When a game period (basketball quarter or volleyball set) completes, ensure a PlayerGameStats
// record exists for EVERY rostered player on both teams for that period (zeros if no actions recorded).
//
// Invocation modes:
// 1) Entity Automation on Game (event: 'update') → detects period completion by comparing old vs new
// 2) Direct call with payload { game_id: string, period_number?: number } → period inferred if absent
//
// Notes:
// - For volleyball, we use the same 'quarter' numeric field to store the set number.
// - This function is idempotent: re-running for the same period will only create missing records.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Try to authenticate. Automations may not have a user; in that case we'll operate as service role.
    const user = await base44.auth.me().catch(() => null);

    const body = await req.json().catch(() => ({}));

    // Helper to fetch a game (service role to avoid RLS friction in automations)
    const getGame = async (id) => {
      const g = await base44.asServiceRole.entities.Game.get(id);
      if (!g) throw new Error('Game not found');
      return g;
    };

    // Detect invocation source
    const isEntityAutomation = body?.event && body?.data;

    let gameId = body.game_id || null;
    let periodNumber = body.period_number || null;

    if (isEntityAutomation && body.event.entity_name === 'Game' && body.event.type === 'update') {
      gameId = body.event.entity_id;
      const newData = body.data || {};
      const oldData = body.old_data || {};

      // Determine if a new period was completed:
      const oldLen = Array.isArray(oldData.quarter_scores) ? oldData.quarter_scores.length : 0;
      const newLen = Array.isArray(newData.quarter_scores) ? newData.quarter_scores.length : 0;

      if (newLen > oldLen) {
        // A new entry was appended to quarter_scores → that period index is completed
        periodNumber = newLen; // 1-based
      } else if (
        typeof newData.current_quarter === 'number' &&
        typeof oldData.current_quarter === 'number' &&
        newData.current_quarter > oldData.current_quarter
      ) {
        // Quarter advanced, assume the previous quarter was just completed
        periodNumber = oldData.current_quarter; // the finished one
      } else {
        return Response.json({ status: 'skipped', reason: 'no period change detected' }, { status: 200 });
      }
    }

    if (!gameId) {
      return Response.json({ error: 'Missing game_id' }, { status: 400 });
    }

    const game = await getGame(gameId);

    // Permission check for direct calls (skip for automations)
    if (!isEntityAutomation) {
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const isAdmin = user.role === 'admin' || user.is_super_admin;
      const sameOrg = user.organization_id && user.organization_id === game.organization_id;
      // Heuristic: allow admins or scorekeepers (flag stored on user)
      const isScorekeeper = !!user.is_scorekeeper;
      if (!(isAdmin || (sameOrg && isScorekeeper))) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // If periodNumber not provided, infer from quarter_scores length (most recently completed)
    if (!periodNumber) {
      const qlen = Array.isArray(game.quarter_scores) ? game.quarter_scores.length : 0;
      if (qlen <= 0) {
        return Response.json({ status: 'skipped', reason: 'no completed periods found to finalize' });
      }
      periodNumber = qlen; // last completed
    }

    const sport = game.sport; // 'basketball' | 'volleyball'

    // Fetch rosters for both teams
    const [homePlayers, awayPlayers] = await Promise.all([
      base44.asServiceRole.entities.Player.filter({ team_id: game.home_team_id }, undefined, 1000),
      base44.asServiceRole.entities.Player.filter({ team_id: game.away_team_id }, undefined, 1000),
    ]);

    // Fetch existing stats for this game+period for both teams to avoid duplicates
    const [existingHome, existingAway] = await Promise.all([
      base44.asServiceRole.entities.PlayerGameStats.filter(
        { game_id: game.id, team_id: game.home_team_id, quarter: periodNumber },
        undefined,
        2000
      ),
      base44.asServiceRole.entities.PlayerGameStats.filter(
        { game_id: game.id, team_id: game.away_team_id, quarter: periodNumber },
        undefined,
        2000
      ),
    ]);

    const existingHomeSet = new Set((existingHome || []).map((s) => s.player_id));
    const existingAwaySet = new Set((existingAway || []).map((s) => s.player_id));

    const zeroBasketball = {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      fouls: 0,
      three_pointers: 0,
      field_goals_made: 0,
      field_goals_attempted: 0,
      free_throws_made: 0,
      free_throws_attempted: 0,
    };

    const zeroVolleyball = {
      aces: 0,
      attacks: 0,
      rally_errors: 0,
    };

    const makeRecord = (player, teamId) => ({
      game_id: game.id,
      player_id: player.id,
      team_id: teamId,
      quarter: periodNumber,
      ...(sport === 'basketball' ? zeroBasketball : zeroVolleyball),
    });

    const toCreate = [];

    for (const p of homePlayers) {
      if (!existingHomeSet.has(p.id)) toCreate.push(makeRecord(p, game.home_team_id));
    }
    for (const p of awayPlayers) {
      if (!existingAwaySet.has(p.id)) toCreate.push(makeRecord(p, game.away_team_id));
    }

    if (toCreate.length === 0) {
      return Response.json({
        status: 'ok',
        message: 'No missing PlayerGameStats to create for this period',
        game_id: game.id,
        period_number: periodNumber,
        created: 0,
        sport,
      });
    }

    // Bulk create in chunks to be safe
    const CHUNK = 200;
    let createdCount = 0;
    for (let i = 0; i < toCreate.length; i += CHUNK) {
      const batch = toCreate.slice(i, i + CHUNK);
      const res = await base44.asServiceRole.entities.PlayerGameStats.bulkCreate(batch);
      createdCount += Array.isArray(res) ? res.length : batch.length;
    }

    return Response.json({
      status: 'ok',
      message: 'Finalized period stats for all rostered players',
      game_id: game.id,
      period_number: periodNumber,
      created: createdCount,
      sport,
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});