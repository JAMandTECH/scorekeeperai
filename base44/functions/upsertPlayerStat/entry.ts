import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isOrgBlockedFromLiveScoring } from "../../shared/trialGuard.ts";

// Retry a Base44 SDK call on transient "Rate limit exceeded" errors with
// exponential backoff. Scoring bursts can briefly trip the account rate limit;
// retrying here prevents a "Failed to save" from surfacing to the scorekeeper.
async function withRetry(fn, attempts = 6) {
  let delay = 400;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e?.message || '';
      const status = e?.status || e?.response?.status;
      // Retry on rate limits and transient 5xx / network blips, not on 4xx.
      const isTransient = /rate limit|timeout|temporarily|ECONNRESET|network/i.test(msg) || status === 429 || (status >= 500 && status < 600);
      if (!isTransient || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 4000);
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await withRetry(() => base44.auth.me());
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { game_id, player_id, team_id, quarter, updates, lineup_context, pm_delta } = body || {};

    const hasStatUpdates = Array.isArray(updates) && updates.length > 0;
    const hasPmDelta = typeof pm_delta === 'number' && pm_delta !== 0;

    if (!game_id || !quarter || (!hasStatUpdates && !hasPmDelta)) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }
    if (hasStatUpdates && (!player_id || !team_id)) {
      return Response.json({ error: 'Invalid payload: player_id and team_id required with updates' }, { status: 400 });
    }
    if (hasPmDelta && !team_id) {
      return Response.json({ error: 'Invalid payload: team_id required with pm_delta' }, { status: 400 });
    }

    // Fetch game to verify org and permissions
    const game = await withRetry(() => base44.asServiceRole.entities.Game.get(game_id));
    if (!game) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    const isAdmin = user.role === 'admin';
    const isSuperAdmin = Boolean(user.is_super_admin);
    const isScorekeeper = Boolean(user.is_scorekeeper);
    const sameOrg = Boolean(
      (user.organization_id && user.organization_id === game.organization_id) ||
      (user.active_organization_id && user.active_organization_id === game.organization_id)
    );
    const email = (user.email || '').toLowerCase();
    const assignedEmails = [
      game.overall_scorekeeper_email,
      game.home_statistician_email,
      game.away_statistician_email,
      ...(Array.isArray(game.assigned_scorekeeper_emails) ? game.assigned_scorekeeper_emails : [])
    ].filter(Boolean).map((e) => String(e).toLowerCase());
    const isGameAssigned = assignedEmails.includes(email);

    if (!(isSuperAdmin || (sameOrg && (isAdmin || isScorekeeper || isGameAssigned)))) {
      return Response.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    // Trial guard: block live-scoring writes for trial/expired/cancelled orgs
    const isTrialBlocked = await isOrgBlockedFromLiveScoring(base44, game.organization_id);
    if (isTrialBlocked) {
      return Response.json({
        error: 'Live scoring is unavailable during your trial. Subscribe to score live games.',
        trial_blocked: true,
      }, { status: 403 });
    }

    // Allowlist of stat fields that may be incremented — prevents overwriting
    // identity/linkage fields (game_id, player_id, team_id, organization_id, etc.)
    const ALLOWED_STAT_KEYS = new Set([
      'points', 'rebounds', 'assists', 'steals', 'blocks', 'fouls',
      'three_pointers', 'field_goals_made', 'field_goals_attempted',
      'free_throws_made', 'free_throws_attempted',
      'attacks', 'aces', 'rally_errors', 'plus_minus',
    ]);

    const applyUpdates = (obj) => {
      const updated = { ...obj };
      for (const u of updates) {
        const key = u.statType;
        if (!ALLOWED_STAT_KEYS.has(key)) continue; // silently skip unknown keys
        const val = Number(u.value) || 0;
        const current = Number(updated[key] || 0);
        const next = Math.max(0, current + val);
        updated[key] = next;
      }
      return updated;
    };

    let saved = null;
    let existing = null;

    if (hasStatUpdates) {
      // Find existing stat for this (game, player, quarter)
      const existingList = await withRetry(() => base44.asServiceRole.entities.PlayerGameStats.filter({
        game_id,
        player_id,
        quarter,
      }));
      existing = existingList && existingList[0] ? existingList[0] : null;

      if (existing) {
        const patch = applyUpdates(existing);
        if (existing.team_id !== team_id) { patch.team_id = team_id; }
        saved = await withRetry(() => base44.asServiceRole.entities.PlayerGameStats.update(existing.id, patch));
      } else {
        const base = {
          game_id,
          organization_id: game.organization_id,
          player_id,
          team_id,
          quarter,
          points: 0,
          rebounds: 0,
          assists: 0,
          steals: 0,
          blocks: 0,
          three_pointers: 0,
          field_goals_made: 0,
          field_goals_attempted: 0,
          free_throws_made: 0,
          free_throws_attempted: 0,
          attacks: 0,
          aces: 0,
          rally_errors: 0,
        };
        const doc = applyUpdates(base);
        saved = await withRetry(() => base44.asServiceRole.entities.PlayerGameStats.create(doc));
      }
    }

    // If points were involved, adjust the game score by the delta only.
    const pointsDelta = hasStatUpdates
      ? updates.filter(u => u.statType === 'points').reduce((sum, u) => sum + (Number(u.value) || 0), 0)
      : 0;

    // Clamp the applied delta so the stored stat never goes negative.
    let effectiveDelta = pointsDelta;
    if (pointsDelta < 0 && existing) {
      const prevPoints = Number(existing.points || 0);
      effectiveDelta = Math.max(-prevPoints, pointsDelta);
    } else if (pointsDelta < 0 && !existing) {
      effectiveDelta = 0;
    }

    // For plus/minus: use pm_delta when provided (volleyball rally points where
    // no individual player stat changes but the score differential applies to
    // all on-court players), otherwise use the points effectiveDelta.
    const pmEffectiveDelta = hasPmDelta ? pm_delta : effectiveDelta;

    // Plus/minus: update the plus_minus for all players currently on court.
    // Uses lineup_context if provided (for undo accuracy), otherwise falls
    // back to the game's persisted active_lineup.
    if (pmEffectiveDelta !== 0) {
      try {
        const lineup = lineup_context || game.active_lineup || { home: [], away: [] };
        const homeActive = Array.isArray(lineup.home) ? lineup.home : [];
        const awayActive = Array.isArray(lineup.away) ? lineup.away : [];
        const scoringTeamIsHome = team_id === game.home_team_id;

        const allActive = [
          ...homeActive.map((pid: string) => ({ pid, teamIsHome: true })),
          ...awayActive.map((pid: string) => ({ pid, teamIsHome: false })),
        ];

        if (allActive.length > 0) {
          const quarterStats = await withRetry(() =>
            base44.asServiceRole.entities.PlayerGameStats.filter({ game_id, quarter })
          );
          const statByPlayer = new Map<string, any>();
          for (const s of quarterStats || []) {
            statByPlayer.set(s.player_id, s);
          }

          const toUpdate: any[] = [];
          const toCreate: any[] = [];

          for (const { pid, teamIsHome } of allActive) {
            const playerPmDelta = scoringTeamIsHome === teamIsHome ? pmEffectiveDelta : -pmEffectiveDelta;
            const existingStat = statByPlayer.get(pid);
            if (existingStat) {
              const newPm = (Number(existingStat.plus_minus) || 0) + playerPmDelta;
              toUpdate.push({ id: existingStat.id, plus_minus: newPm });
            } else {
              const playerTeamId = teamIsHome ? game.home_team_id : game.away_team_id;
              toCreate.push({
                game_id,
                organization_id: game.organization_id,
                player_id: pid,
                team_id: playerTeamId,
                quarter,
                points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
                fouls: 0, three_pointers: 0,
                field_goals_made: 0, field_goals_attempted: 0,
                free_throws_made: 0, free_throws_attempted: 0,
                attacks: 0, aces: 0, rally_errors: 0,
                plus_minus: playerPmDelta,
              });
            }
          }

          if (toUpdate.length > 0) {
            await withRetry(() => base44.asServiceRole.entities.PlayerGameStats.bulkUpdate(toUpdate));
          }
          if (toCreate.length > 0) {
            await withRetry(() => base44.asServiceRole.entities.PlayerGameStats.bulkCreate(toCreate));
          }
        }
      } catch (pmErr) {
        console.error('Plus/minus update failed (stat still saved):', pmErr?.message || pmErr);
      }
    }

    // The player stat above is the source of truth and is already saved. The
    // game-score sync below is best-effort: if it hits a rate limit after all
    // retries, DON'T fail the whole request — the score is recomputed on the
    // next load/refresh. Failing here would wrongly tell the scorekeeper the
    // stat wasn't saved (and revert their tap) even though it was.
    let gameScoreUpdate = null;
    if (effectiveDelta !== 0) {
      try {
        const isHome = team_id === game.home_team_id;
        const newHome = Math.max(0, (Number(game.home_score) || 0) + (isHome ? effectiveDelta : 0));
        const newAway = Math.max(0, (Number(game.away_score) || 0) + (!isHome ? effectiveDelta : 0));
        await withRetry(() => base44.asServiceRole.entities.Game.update(game_id, {
          home_score: newHome,
          away_score: newAway,
        }));
        gameScoreUpdate = { home_score: newHome, away_score: newAway };
      } catch (scoreErr) {
        console.error('Game score sync failed (stat still saved):', scoreErr?.message || scoreErr);
      }
    }

    return Response.json({ success: true, stat: saved, game_score: gameScoreUpdate });
  } catch (error) {
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});