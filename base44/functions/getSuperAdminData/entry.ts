import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isSuperAdmin = user.role === 'admin' &&
      (user.is_super_admin === true || user.data?.is_super_admin === true);

    if (!isSuperAdmin) {
      return Response.json({ error: 'Forbidden — super admin only' }, { status: 403 });
    }

    const sr = base44.asServiceRole;

    const [organizations, teams, players, games, users, pendingAdminRequests] = await Promise.all([
      sr.entities.Organization.list(undefined, 500),
      sr.entities.Team.list(undefined, 500),
      sr.entities.Player.list(undefined, 1000),
      sr.entities.Game.list('-game_date', 500),
      sr.entities.User.list(undefined, 500),
      sr.entities.AdminRequest.filter({ status: 'pending' }, undefined, 100),
    ]);

    return Response.json({
      organizations: organizations || [],
      teams: teams || [],
      players: players || [],
      games: games || [],
      users: users || [],
      pendingAdminRequests: pendingAdminRequests || [],
    });
  } catch (error) {
    console.error('getSuperAdminData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}