import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Entity automation handler: fires when a Game is created/updated.
// Only aggregates when the game is completed. Idempotent via aggregatePlayerStats.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_) { body = {}; }

    const event = body.event || {};
    const data = body.data || null;
    const entityId = event.entity_id || (data && data.id) || null;

    let game = data;
    if ((!game || game.status === undefined) && entityId) {
      try {
        game = await base44.asServiceRole.entities.Game.get(entityId);
      } catch (_) { game = null; }
    }

    if (!game) {
      return Response.json({ ok: true, skipped: 'no_game' });
    }
    if (String(game.status) !== 'completed') {
      return Response.json({ ok: true, skipped: 'not_completed' });
    }

    const res = await base44.asServiceRole.functions.invoke('aggregatePlayerStats', {
      organization_id: game.organization_id,
      game_ids: [game.id]
    });

    return Response.json({ ok: true, game_id: game.id, result: res?.data ?? res ?? null });
  } catch (error) {
    console.error('onGameCompletedAggregate error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});