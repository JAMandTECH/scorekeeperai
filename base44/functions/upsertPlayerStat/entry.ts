import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Retry a Base44 SDK call on transient "Rate limit exceeded" errors with
// exponential backoff. Scoring bursts can briefly trip the account rate limit;
// retrying here prevents a "Failed to save" from surfacing to the scorekeeper.
async function withRetry(fn, attempts = 4) {
  let delay = 500;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      const isRateLimit = /rate limit/i.test(e?.message || '');
      if (!isRateLimit || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
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
    const { game_id, player_id, team_id, quarter, updates } = body || {};

    if (!game_id || !player_id || !team_id || !quarter || !Array.isArray(updates)) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
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

    // Find existing stat for this (game, player, quarter)
    const existingList = await withRetry(() => base44.asServiceRole.entities.PlayerGameStats.filter({
      game_id,
      player_id,
      quarter,
    }));

    const existing = existingList && existingList[0] ? existingList[0] : null;

    const applyUpdates = (obj) => {
      const updated = { ...obj };
      for (const u of updates) {
        const key = u.statType;
        const val = Number(u.value) || 0;
        const current = Number(updated[key] || 0);
        const next = Math.max(0, current + val);
        updated[key] = next;
      }
      return updated;
    };

    let saved;
    if (existing) {
      const patch = applyUpdates(existing);
      if (existing.team_id !== team_id) { patch.team_id = team_id; }
      saved = await withRetry(() => base44.asServiceRole.entities.PlayerGameStats.update(existing.id, patch));
    } else {
      const base = {
        game_id,
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
        // Volleyball fields
        attacks: 0,
        aces: 0,
        rally_errors: 0,
      };
      const doc = applyUpdates(base);
      saved = await withRetry(() => base44.asServiceRole.entities.PlayerGameStats.create(doc));
    }

    // If points were involved, adjust the game score by the delta only.
    // Applying the delta (instead of refetching ALL player stats every time)
    // keeps this to a single lightweight write and avoids rate limits during
    // rapid scoring. The stored stat above is already the source of truth.
    const pointsDelta = updates
      .filter(u => u.statType === 'points')
      .reduce((sum, u) => sum + (Number(u.value) || 0), 0);

    // Clamp the applied delta so the stored stat never goes negative — mirror
    // the same Math.max(0, ...) rule used per-stat above.
    let effectiveDelta = pointsDelta;
    if (pointsDelta < 0 && existing) {
      const prevPoints = Number(existing.points || 0);
      effectiveDelta = Math.max(-prevPoints, pointsDelta);
    } else if (pointsDelta < 0 && !existing) {
      effectiveDelta = 0;
    }

    let gameScoreUpdate = null;
    if (effectiveDelta !== 0) {
      const isHome = team_id === game.home_team_id;
      const newHome = Math.max(0, (Number(game.home_score) || 0) + (isHome ? effectiveDelta : 0));
      const newAway = Math.max(0, (Number(game.away_score) || 0) + (!isHome ? effectiveDelta : 0));
      await withRetry(() => base44.asServiceRole.entities.Game.update(game_id, {
        home_score: newHome,
        away_score: newAway,
      }));
      gameScoreUpdate = { home_score: newHome, away_score: newAway };
    }

    return Response.json({ success: true, stat: saved, game_score: gameScoreUpdate });
  } catch (error) {
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});