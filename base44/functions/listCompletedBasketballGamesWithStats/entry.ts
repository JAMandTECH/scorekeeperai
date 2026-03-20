import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Returns a list of completed basketball games that have recorded individual player statistics
// Optional payload:
// {
//   organization_id?: string, // defaults to user's organization or active organization
//   limit?: number            // max number of completed games to scan (default 200)
// }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const limit = typeof payload.limit === 'number' && payload.limit > 0 ? Math.min(payload.limit, 500) : 200;

    // Resolve organization scope
    const orgId = payload.organization_id || user.organization_id || user.active_organization_id;
    if (!orgId) {
      return Response.json({ error: 'No organization context available' }, { status: 400 });
    }

    // Fetch completed basketball games for this org (most recent first)
    const completedGames = await base44.entities.Game.filter(
      { organization_id: orgId, sport: 'basketball', status: 'completed' },
      '-game_date',
      limit
    );

    // For each game, check if at least one PlayerGameStats record exists (limit 1 for efficiency)
    const CHUNK_SIZE = 20;
    const chunks = [];
    for (let i = 0; i < completedGames.length; i += CHUNK_SIZE) {
      chunks.push(completedGames.slice(i, i + CHUNK_SIZE));
    }

    const gamesWithStats = [];

    for (const chunk of chunks) {
      const checks = chunk.map(async (g) => {
        const statsSample = await base44.entities.PlayerGameStats.filter({ game_id: g.id }, undefined, 1);
        if (Array.isArray(statsSample) && statsSample.length > 0) {
          gamesWithStats.push({
            id: g.id,
            game_date: g.game_date,
            home_team_id: g.home_team_id,
            away_team_id: g.away_team_id,
            home_score: g.home_score,
            away_score: g.away_score,
            division: g.division || null,
          });
        }
      });
      await Promise.all(checks);
    }

    // Sort by game_date desc to match primary fetch ordering
    gamesWithStats.sort((a, b) => new Date(b.game_date) - new Date(a.game_date));

    return Response.json({
      organization_id: orgId,
      total_completed_games_scanned: completedGames.length,
      with_stats_count: gamesWithStats.length,
      games: gamesWithStats,
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});