import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isSuperAdmin, resolveCallerOrg } from '../../shared/orgAuth.ts';

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

    // Entity automation calls carry an event object from the platform.
    // Direct HTTP calls must be authenticated and org-scoped.
    const isEntityAutomation = Boolean(event && event.entity_name);
    if (!isEntityAutomation) {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (!isSuperAdmin(user) && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    // Always fetch the game from the database — never trust client-supplied data.
    let game = null;
    if (entityId) {
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

    // For direct (non-automation) calls, verify the caller's org matches.
    if (!isEntityAutomation) {
      const user = await base44.auth.me().catch(() => null);
      const callerOrg = resolveCallerOrg(user);
      if (!isSuperAdmin(user) && game.organization_id !== callerOrg) {
        return Response.json({ error: 'Forbidden: game does not belong to your organization' }, { status: 403 });
      }
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