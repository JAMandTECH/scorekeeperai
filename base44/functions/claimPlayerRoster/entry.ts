import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { player_id, reason } = body;

    if (!player_id) return Response.json({ error: 'Player ID is required' }, { status: 400 });

    const orgId = user.data?.organization_id || user.data?.active_organization_id;
    if (!orgId) return Response.json({ error: 'No organization found for your account' }, { status: 400 });

    // Validate the player exists and belongs to the user's org
    const player = await base44.asServiceRole.entities.Player.get(player_id);
    if (!player) return Response.json({ error: 'Player not found' }, { status: 404 });
    if (player.organization_id !== orgId) {
      return Response.json({ error: 'This player is not in your organization' }, { status: 403 });
    }

    // Check if this player already has an approved profile
    const existingProfiles = await base44.asServiceRole.entities.PlayerProfile.filter({
      player_id,
      claim_status: 'approved'
    });
    if (existingProfiles.length > 0) {
      return Response.json({ error: 'This player already has a claimed profile' }, { status: 409 });
    }

    // Check for existing pending claim by this user for this player
    const existingClaims = await base44.asServiceRole.entities.PlayerClaim.filter({
      player_id,
      user_id: user.id,
      status: 'pending'
    });
    if (existingClaims.length > 0) {
      return Response.json({ error: 'You already have a pending claim for this player' }, { status: 409 });
    }

    // A user can only have one approved profile
    const userProfiles = await base44.asServiceRole.entities.PlayerProfile.filter({
      user_id: user.id,
      claim_status: 'approved'
    });
    if (userProfiles.length > 0) {
      return Response.json({ error: 'You already have a claimed profile' }, { status: 409 });
    }

    // Denormalize team name for display
    let team_name = '';
    if (player.team_id) {
      try {
        const team = await base44.asServiceRole.entities.Team.get(player.team_id);
        team_name = team?.name || '';
      } catch (e) {
        // team lookup is best-effort
      }
    }

    const claim = await base44.entities.PlayerClaim.create({
      organization_id: orgId,
      player_id,
      player_name: `${player.first_name} ${player.last_name}`,
      team_name,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      reason: reason || '',
      status: 'pending'
    });

    return Response.json({ success: true, claim });
  } catch (error) {
    console.error('Error in claimPlayerRoster:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}