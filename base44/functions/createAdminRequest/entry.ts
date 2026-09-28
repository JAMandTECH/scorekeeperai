import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { organization_name, phone_number, reason } = body;

    if (!organization_name || !phone_number) {
      return Response.json({ error: 'Organization name and phone number are required' }, { status: 400 });
    }

    // user_email is enforced server-side — a caller cannot file a request for someone else.
    const request = await base44.entities.AdminRequest.create({
      user_email: user.email,
      user_name: user.full_name || '',
      organization_name,
      phone_number,
      reason: reason || '',
      status: 'pending',
    });

    // Notify super admins (requires admin-level read of users).
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const superAdmins = allUsers.filter((u: any) => u.role === 'admin' && u.is_super_admin === true);
      for (const sa of superAdmins) {
        await base44.integrations.Core.SendEmail({
          to: sa.email,
          subject: `New Admin Access Request: ${organization_name}`,
          body: `
            <h2>New Organization Admin Request</h2>
            <p>A new admin access request has been submitted:</p>
            <ul>
              <li><strong>Organization Name:</strong> ${organization_name}</li>
              <li><strong>Requested by:</strong> ${user.full_name || ''} (${user.email})</li>
              <li><strong>Phone:</strong> ${phone_number}</li>
              <li><strong>Reason:</strong> ${reason || ''}</li>
            </ul>
            <p>Please review this request in the Admin Approvals section of your dashboard.</p>
          `,
        });
      }
    } catch (emailError) {
      // Non-critical — request is still created.
    }

    return Response.json({ success: true, request });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}