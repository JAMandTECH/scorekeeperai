import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { game_id, patch } = await req.json();
    if (!game_id || !patch || typeof patch !== 'object') {
      return Response.json({ error: 'Invalid payload: require game_id and patch object' }, { status: 400 });
    }

    // Fetch game as service role to verify org and existence
    const game = await base44.asServiceRole.entities.Game.get(game_id);
    if (!game) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    // Permission check: admin OR scorekeeper AND same organization (or super admin)
    const isAdmin = user.role === 'admin';
    const sameOrg = !!(user.organization_id && user.organization_id === game.organization_id) || !!(user.active_organization_id && user.active_organization_id === game.organization_id);
    const isSuperAdmin = Boolean(user.is_super_admin);
    const isScorekeeper = Boolean(user.is_scorekeeper);

    if (!(isSuperAdmin || (isAdmin && sameOrg) || (isScorekeeper && sameOrg))) {
      return Response.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    // Allow only specific fields to be updated
    const allowedKeys = new Set([
      'status',
      'home_score', 'away_score',
      'quarter_scores', 'current_quarter',
      'home_timeouts', 'away_timeouts',
      'is_default', 'defaulted_team_id', 'winning_team_id',
      'notes', 'stream_url'
    ]);

    const safePatch = Object.fromEntries(
      Object.entries(patch).filter(([k]) => allowedKeys.has(k))
    );

    if (Object.keys(safePatch).length === 0) {
      return Response.json({ error: 'No allowed fields in patch' }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.Game.update(game_id, safePatch);
    return Response.json({ success: true, game: updated });
  } catch (error) {
    const message = error?.message || 'Internal Server Error';
    return Response.json({ error: message }, { status: 500 });
  }
});