import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_ROLES = ['fan', 'member', 'player'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { request_id, action } = body || {};

    if (!request_id || !['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const orgId = user.organization_id || user.active_organization_id;
    if (!orgId) {
      return Response.json({ error: 'No organization associated with your account' }, { status: 400 });
    }

    // Fetch the join request — verify it belongs to the admin's org
    const requests = await base44.asServiceRole.entities.OrganizationJoinRequest.filter({
      id: request_id,
      organization_id: orgId,
    });
    const joinRequest = requests?.[0];
    if (!joinRequest) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    if (joinRequest.status !== 'pending') {
      return Response.json({ error: 'Request already processed' }, { status: 400 });
    }

    // Resolve the requester's email from the User record (server-verified, not client-supplied)
    const users = await base44.asServiceRole.entities.User.filter({ id: joinRequest.user_id });
    const requestingUser = users?.[0];
    if (!requestingUser || !requestingUser.email) {
      return Response.json({ error: 'Requesting user not found' }, { status: 404 });
    }

    // Constrain role to the allowed enum (prevents HTML injection via requested_role_in_org)
    const role = ALLOWED_ROLES.includes(joinRequest.requested_role_in_org)
      ? joinRequest.requested_role_in_org
      : 'fan';

    const orgName = joinRequest.organization_name || 'the organization';

    if (action === 'approve') {
      // Create UserOrganization entry with server-verified email
      await base44.asServiceRole.entities.UserOrganization.create({
        user_id: joinRequest.user_id,
        user_email: requestingUser.email,
        organization_id: orgId,
        role_in_org: role,
        status: 'active',
      });

      // Update request status
      await base44.asServiceRole.entities.OrganizationJoinRequest.update(request_id, {
        status: 'approved',
      });

      // Create in-app notification
      await base44.asServiceRole.entities.Notification.create({
        organization_id: orgId,
        type: 'join_approved',
        title: 'Join Request Approved!',
        message: `You are now a ${role} of ${orgName}`,
        data: {
          organization_name: orgName,
          role,
          user_id: joinRequest.user_id,
        },
      });

      // Send email to the server-verified address; use plain text to avoid HTML injection
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: requestingUser.email,
        subject: `Welcome to ${orgName}!`,
        text: `Your request to join ${orgName} as a ${role} has been approved! You can now access the organization.`,
      });
    } else {
      // Reject
      await base44.asServiceRole.entities.OrganizationJoinRequest.update(request_id, {
        status: 'rejected',
      });

      await base44.asServiceRole.entities.Notification.create({
        organization_id: orgId,
        type: 'join_rejected',
        title: 'Join Request Update',
        message: `Your request to join ${orgName} was not approved`,
        data: {
          organization_name: orgName,
          user_id: joinRequest.user_id,
        },
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: requestingUser.email,
        subject: `Update on your request to join ${orgName}`,
        text: `We regret to inform you that your request to join ${orgName} was not approved at this time. Please contact the organization for more details.`,
      });
    }

    return Response.json({ success: true, action, user_email: requestingUser.email });
  } catch (error) {
    console.error('processJoinRequest error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});