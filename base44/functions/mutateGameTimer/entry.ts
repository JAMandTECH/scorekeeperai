import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Whitelist of fields a timekeeper/admin may update on a GameTimer.
// Identity fields (game_id, organization_id, season_id, timekeeper_email)
// are never accepted from the client patch.
const TIMER_UPDATABLE_FIELDS = new Set([
  'period_length_seconds',
  'period_count',
  'period_structure',
  'shot_clock_length_seconds',
  'current_period',
  'game_clock_remaining_ms',
  'game_clock_running',
  'game_clock_end_iso',
  'shot_clock_remaining_ms',
  'shot_clock_running',
  'shot_clock_end_iso',
  'possession',
]);

function sanitizeTimerPatch(patch) {
  if (!patch || typeof patch !== 'object') return {};
  const clean = {};
  for (const key of Object.keys(patch)) {
    if (TIMER_UPDATABLE_FIELDS.has(key)) clean[key] = patch[key];
  }
  return clean;
}

// Handles GameTimer create + update for timekeeper users.
// RLS user_condition cannot match custom user flags (is_timekeeper), so the
// service role performs the write after we verify the caller is the assigned
// timekeeper for the game.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, game_id, timer_id, patch } = body || {};

    if (!action) return Response.json({ error: 'action required' }, { status: 400 });
    const email = (user.email || '').toLowerCase();

    // Resolve the game and confirm the caller is its assigned timekeeper.
    let game;
    if (action === 'create') {
      if (!game_id) return Response.json({ error: 'game_id required' }, { status: 400 });
      game = await base44.asServiceRole.entities.Game.get(game_id);
    } else {
      if (!timer_id) return Response.json({ error: 'timer_id required' }, { status: 400 });
      const timer = await base44.asServiceRole.entities.GameTimer.get(timer_id);
      if (!timer) return Response.json({ error: 'Timer not found' }, { status: 404 });
      game = await base44.asServiceRole.entities.Game.get(timer.game_id);
    }

    if (!game) return Response.json({ error: 'Game not found' }, { status: 404 });
    if ((game.timekeeper_email || '').toLowerCase() !== email && user.role !== 'admin') {
      return Response.json({ error: 'Not the assigned timekeeper for this game' }, { status: 403 });
    }

    const safePatch = sanitizeTimerPatch(patch);

    if (action === 'create') {
      const created = await base44.asServiceRole.entities.GameTimer.create({
        ...safePatch,
        game_id: game.id,
        organization_id: game.organization_id,
        season_id: game.season_id,
        timekeeper_email: game.timekeeper_email,
        last_updated_by: user.email,
      });
      return Response.json(created);
    }

    if (action === 'update') {
      const updated = await base44.asServiceRole.entities.GameTimer.update(timer_id, {
        ...safePatch,
        last_updated_by: user.email,
      });
      return Response.json(updated);
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    console.error('mutateGameTimer error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}