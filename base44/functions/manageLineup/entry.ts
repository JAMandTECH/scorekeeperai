import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { isOrgBlockedFromLiveScoring } from "../../shared/trialGuard.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { game_id, action, team, player_ids, out_player_id, in_player_id } = body || {};

    if (!game_id || !['set_starters', 'substitute'].includes(action)) {
      return Response.json({ error: 'Invalid request: require game_id and action' }, { status: 400 });
    }
    if (!['home', 'away'].includes(team)) {
      return Response.json({ error: 'Invalid team: must be "home" or "away"' }, { status: 400 });
    }

    let game;
    try {
      game = await base44.asServiceRole.entities.Game.get(game_id);
    } catch (e) {
      const msg = String(e?.message || e || '');
      if (/not found/i.test(msg)) {
        return Response.json({ error: 'Game not found' }, { status: 404 });
      }
      throw e; // re-throw unexpected errors to the outer catch
    }
    if (!game) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    // Permission check
    const isAdmin = user.role === 'admin';
    const isSuperAdmin = Boolean(user.is_super_admin);
    const isScorekeeper = Boolean(user.is_scorekeeper);
    const sameOrg = Boolean(
      (user.organization_id && user.organization_id === game.organization_id) ||
      (user.active_organization_id && user.active_organization_id === game.organization_id)
    );
    const email = (user.email || '').toLowerCase();
    const assignedEmails = [
      game.overall_scorekeeper_email,
      game.home_statistician_email,
      game.away_statistician_email,
      ...(Array.isArray(game.assigned_scorekeeper_emails) ? game.assigned_scorekeeper_emails : [])
    ].filter(Boolean).map((e) => String(e).toLowerCase());
    const isGameAssigned = assignedEmails.includes(email);

    if (!(isSuperAdmin || (sameOrg && (isAdmin || isScorekeeper || isGameAssigned)))) {
      return Response.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    // Trial guard
    const isTrialBlocked = await isOrgBlockedFromLiveScoring(base44, game.organization_id);
    if (isTrialBlocked) {
      return Response.json({
        error: 'Live scoring is unavailable during your trial. Subscribe to score live games.',
        trial_blocked: true,
      }, { status: 403 });
    }

    const lineupSize = game.sport === 'basketball' ? 5 : 6;
    const currentLineup = game.active_lineup || { home: [], away: [] };

    if (action === 'set_starters') {
      if (!Array.isArray(player_ids)) {
        return Response.json({ error: 'player_ids must be an array' }, { status: 400 });
      }
      if (player_ids.length !== lineupSize) {
        return Response.json({ error: `Starting lineup must have exactly ${lineupSize} players` }, { status: 400 });
      }
      // Verify all players belong to the correct team
      const teamId = team === 'home' ? game.home_team_id : game.away_team_id;
      const players = await base44.asServiceRole.entities.Player.filter({ team_id: teamId });
      const validIds = new Set(players.map((p: any) => p.id));
      const allValid = player_ids.every((id: string) => validIds.has(id));
      if (!allValid) {
        return Response.json({ error: 'One or more players do not belong to this team' }, { status: 400 });
      }

      const updatedLineup = { ...currentLineup, [team]: player_ids };
      const updated = await base44.asServiceRole.entities.Game.update(game_id, { active_lineup: updatedLineup });
      return Response.json({ success: true, game: updated, lineup: updatedLineup });
    }

    if (action === 'substitute') {
      if (!out_player_id || !in_player_id) {
        return Response.json({ error: 'Substitution requires out_player_id and in_player_id' }, { status: 400 });
      }
      const teamLineup = currentLineup[team] || [];
      if (!teamLineup.includes(out_player_id)) {
        return Response.json({ error: 'Outgoing player is not in the active lineup' }, { status: 400 });
      }
      if (teamLineup.includes(in_player_id)) {
        return Response.json({ error: 'Incoming player is already in the active lineup' }, { status: 400 });
      }
      const newLineup = teamLineup.map((id: string) => (id === out_player_id ? in_player_id : id));
      const updatedLineup = { ...currentLineup, [team]: newLineup };
      const updated = await base44.asServiceRole.entities.Game.update(game_id, { active_lineup: updatedLineup });
      return Response.json({ success: true, game: updated, lineup: updatedLineup });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    const msg = String(error?.message || error || 'Unknown error');
    console.error('manageLineup error:', msg, error?.stack || '');
    // Return the actionable message so the client can show it instead of a
    // generic "Internal Server Error" alert. Branch-write restrictions, RLS
    // denials, and transient SDK errors all carry useful context here.
    return Response.json({ error: msg }, { status: 500 });
  }
});