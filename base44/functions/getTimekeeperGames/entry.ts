import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isTimekeeper = user.is_timekeeper === true;
    const isAdmin = user.role === 'admin';

    // Only timekeepers (or admins) should fetch their assigned games
    if (!isTimekeeper && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const email = (user.email || '').toLowerCase();
    const orgId = user.organization_id || user.active_organization_id || null;

    // Service role bypasses Game RLS so a timekeeper-only user can read their assigned games
    const allGames = await base44.asServiceRole.entities.Game.list('-game_date', 500);

    const myGames = (allGames || [])
      .filter((g) => (g.timekeeper_email || '').toLowerCase() === email)
      .filter((g) => !orgId || g.organization_id === orgId)
      .map((g) => ({
        id: g.id,
        home_team_id: g.home_team_id,
        away_team_id: g.away_team_id,
        sport: g.sport,
        game_date: g.game_date,
        court_number: g.court_number,
        location: g.location,
        status: g.status,
        archived: g.archived,
        division: g.division,
        organization_id: g.organization_id,
        season_id: g.season_id,
        timekeeper_email: g.timekeeper_email,
        assigned_scorekeeper_emails: g.assigned_scorekeeper_emails,
      }));

    return Response.json(myGames);
  } catch (error) {
    console.error('getTimekeeperGames error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});