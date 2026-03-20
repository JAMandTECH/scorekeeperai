import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine if user can manage games (admin or role with manage_games)
    let canManageGames = user.role === 'admin';

    if (!canManageGames && user.role_id) {
      try {
        const roles = await base44.entities.Role.filter({ id: user.role_id });
        const role = Array.isArray(roles) ? roles[0] : null;
        if (role?.permissions?.manage_games) {
          canManageGames = true;
        }
      } catch (_) {
        // ignore and keep canManageGames as false
      }
    }

    if (!canManageGames) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = user.organization_id || user.active_organization_id || null;

    // Service role to list users (built-in User entity restricts listing for non-admins)
    const allUsers = await base44.asServiceRole.entities.User.list();

    const scorekeepers = allUsers
      .filter((u) => u.is_scorekeeper === true && (!orgId || u.organization_id === orgId || u.active_organization_id === orgId))
      .map((u) => ({
        email: u.email,
        full_name: u.full_name || u.email,
        organization_id: u.organization_id || u.active_organization_id || null,
      }));

    return Response.json(scorekeepers);
  } catch (error) {
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});