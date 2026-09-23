import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Server-side authorization: only super admins may reject.
    if (user.role !== 'admin' || !user.is_super_admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { request_id } = body;
    if (!request_id) return Response.json({ error: 'Missing request_id' }, { status: 400 });

    const request = await base44.asServiceRole.entities.AdminRequest.get(request_id);
    if (!request) return Response.json({ error: 'Request not found' }, { status: 404 });
    if (request.status !== 'pending') {
      return Response.json({ error: 'Request has already been processed' }, { status: 400 });
    }

    await base44.asServiceRole.entities.AdminRequest.update(request_id, {
      status: 'rejected',
    });

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: request.user_email,
        subject: "Admin Access Request Update",
        body: `
          <h2>Admin Access Request Update</h2>
          <p>Hello ${request.user_name},</p>
          <p>Thank you for your interest in becoming an administrator.</p>
          <p>After reviewing your request for "${request.organization_name}", we are unable to approve admin access at this time.</p>
          <p>If you have questions or believe this was an error, please contact support.</p>
        `,
      });
    } catch (emailError) {
      // Non-critical.
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}