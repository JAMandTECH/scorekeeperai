import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { notifySuperAdmins } from '../../shared/superAdminNotify.ts';

/**
 * Invoked by the "On User Signup" workflow (app_user_auth trigger, signup event).
 * Notifies super admins by email + in-app Notification whenever a new user signs up.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { user_id, email, auth_method, full_name } = body;

    if (!email) {
      console.error('notifySuperAdminSignup: missing email in payload');
      return Response.json({ error: 'Missing email' }, { status: 400 });
    }

    const notifyResult = await notifySuperAdmins({
      base44,
      subject: `New User Signup: ${email}`,
      htmlBody: `
        <h2>New User Signup</h2>
        <p>A new user has signed up to ScorekeeperAI:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Name:</strong> ${full_name || '—'}</li>
          <li><strong>Auth Method:</strong> ${auth_method || '—'}</li>
          <li><strong>User ID:</strong> ${user_id || '—'}</li>
        </ul>
      `,
      notificationType: 'signup',
      title: `New signup: ${email}`,
      message: `${full_name || email} signed up via ${auth_method || 'auth'}.`,
      data: {
        user_id,
        email,
        auth_method,
        full_name,
      },
    });

    return Response.json({ success: true, notifyResult });
  } catch (error) {
    console.error('notifySuperAdminSignup error:', error?.message || error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}