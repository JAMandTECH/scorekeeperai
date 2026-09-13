import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

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

    if (action === 'create') {
      const created = await base44.asServiceRole.entities.GameTimer.create({
        ...patch,
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
        ...patch,
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