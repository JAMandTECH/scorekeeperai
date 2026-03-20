import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = user.organization_id || user.active_organization_id;
    if (!orgId) {
      return Response.json({ error: 'No organization context found' }, { status: 400 });
    }

    // Allow only org admins, super admins, or scorekeepers to run this
    const isAdmin = user.role === 'admin' || user.is_super_admin === true;
    const isScorekeeper = Boolean(user.is_scorekeeper);
    if (!isAdmin && !isScorekeeper) {
      return Response.json({ error: 'Forbidden: Admin or scorekeeper required' }, { status: 403 });
    }

    // Find the most recent completed game in this org
    const games = await base44.entities.Game.filter({ organization_id: orgId, status: 'completed' }, '-game_date', 1);
    if (!games || games.length === 0) {
      return Response.json({ message: 'No completed games found' }, { status: 200 });
    }

    const game = games[0];

    // Force finalize all periods for this game (use user-scoped call; the target function enforces its own auth too)
    const finalizeRes = await base44.functions.invoke('forceFinalizeAllPeriods', { game_id: game.id });

    // Re-fetch stats to report outcome
    const stats = await base44.entities.PlayerGameStats.filter({ game_id: game.id });

    return Response.json({
      message: 'Finalization triggered for most recent completed game',
      game: { id: game.id, home_team_id: game.home_team_id, away_team_id: game.away_team_id, sport: game.sport, game_date: game.game_date },
      finalize_response: finalizeRes?.data ?? null,
      player_stats_count: stats?.length ?? 0
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});