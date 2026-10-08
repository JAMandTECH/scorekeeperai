import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { claim_id, action, admin_notes } = body;

    if (!claim_id || !action) {
      return Response.json({ error: 'Claim ID and action are required' }, { status: 400 });
    }
    if (!['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const claim = await base44.asServiceRole.entities.PlayerClaim.get(claim_id);
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    // Org admins can only review claims in their own org; super admins can review any
    const orgId = user.data?.organization_id || user.data?.active_organization_id;
    const isSuperAdmin = user.role === 'admin' && user.is_super_admin === true;
    if (!isSuperAdmin && claim.organization_id !== orgId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'approve') {
      // Double-check no approved profile exists for this player (race safety)
      const existing = await base44.asServiceRole.entities.PlayerProfile.filter({
        player_id: claim.player_id,
        claim_status: 'approved'
      });
      if (existing.length > 0) {
        return Response.json({ error: 'This player already has an approved profile' }, { status: 409 });
      }

      await base44.asServiceRole.entities.PlayerClaim.update(claim_id, {
        status: 'approved',
        admin_notes: admin_notes || '',
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString()
      });

      const profile = await base44.asServiceRole.entities.PlayerProfile.create({
        organization_id: claim.organization_id,
        player_id: claim.player_id,
        user_id: claim.user_id,
        user_email: claim.user_email,
        user_name: claim.user_name,
        bio: '',
        photo_url: '',
        visibility: 'private',
        claim_status: 'approved',
        claim_date: claim.created_date,
        approved_date: new Date().toISOString(),
        followers_count: 0,
        posts_count: 0
      });

      return Response.json({ success: true, profile });
    } else {
      await base44.asServiceRole.entities.PlayerClaim.update(claim_id, {
        status: 'rejected',
        admin_notes: admin_notes || '',
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString()
      });

      return Response.json({ success: true });
    }
  } catch (error) {
    console.error('Error in reviewPlayerClaim:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}