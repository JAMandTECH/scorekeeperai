import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { game_id, player_id, team_id, quarter, updates } = body || {};

    if (!game_id || !player_id || !team_id || !quarter || !Array.isArray(updates)) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Fetch game to verify org and permissions
    const game = await base44.asServiceRole.entities.Game.get(game_id);
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

    if (!(isSuperAdmin || (isAdmin && sameOrg) || (isScorekeeper && sameOrg))) {
      return Response.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    // Find existing stat for this (game, player, quarter)
    const existingList = await base44.asServiceRole.entities.PlayerGameStats.filter({
      game_id,
      player_id,
      quarter,
    });

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
      saved = await base44.asServiceRole.entities.PlayerGameStats.update(existing.id, patch);
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
      };
      const doc = applyUpdates(base);
      saved = await base44.asServiceRole.entities.PlayerGameStats.create(doc);
    }

    return Response.json({ success: true, stat: saved });
  } catch (error) {
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});