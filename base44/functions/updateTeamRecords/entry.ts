import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { game_id, mode, winner_team, defaulted_team } = body || {};

    if (!game_id || !mode) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

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

    const homeTeamId = game.home_team_id;
    const awayTeamId = game.away_team_id;

    const homeTeam = await base44.asServiceRole.entities.Team.get(homeTeamId);
    const awayTeam = await base44.asServiceRole.entities.Team.get(awayTeamId);

    if (!homeTeam || !awayTeam) {
      return Response.json({ error: 'Teams not found' }, { status: 404 });
    }

    const inc = async (teamId, winsDelta, lossesDelta) => {
      const team = teamId === homeTeamId ? homeTeam : awayTeam;
      const wins = Math.max(0, (team.wins || 0) + (winsDelta || 0));
      const losses = Math.max(0, (team.losses || 0) + (lossesDelta || 0));
      const updated = await base44.asServiceRole.entities.Team.update(teamId, { wins, losses });
      if (teamId === homeTeamId) {
        homeTeam.wins = updated.wins; homeTeam.losses = updated.losses;
      } else {
        awayTeam.wins = updated.wins; awayTeam.losses = updated.losses;
      }
    };

    if (mode === 'apply_winner') {
      if (winner_team !== 'home' && winner_team !== 'away') {
        return Response.json({ error: 'winner_team must be home|away' }, { status: 400 });
      }
      const winnerId = winner_team === 'home' ? homeTeamId : awayTeamId;
      const loserId = winner_team === 'home' ? awayTeamId : homeTeamId;
      await inc(winnerId, +1, 0);
      await inc(loserId, 0, +1);
    } else if (mode === 'apply_default') {
      if (defaulted_team !== 'home' && defaulted_team !== 'away') {
        return Response.json({ error: 'defaulted_team must be home|away' }, { status: 400 });
      }
      const defId = defaulted_team === 'home' ? homeTeamId : awayTeamId;
      const oppId = defaulted_team === 'home' ? awayTeamId : homeTeamId;
      await inc(oppId, +1, 0);
      await inc(defId, 0, +1);
    } else if (mode === 'undo_default') {
      // Use game fields to revert default
      const defId = game.defaulted_team_id;
      const winId = game.winning_team_id;
      if (!defId || !winId) {
        return Response.json({ error: 'No default outcome to undo' }, { status: 400 });
      }
      await inc(winId, -1, 0);
      await inc(defId, 0, -1);
    } else {
      return Response.json({ error: 'Invalid mode' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});