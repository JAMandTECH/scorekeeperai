import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { notifySuperAdmins } from '../../shared/superAdminNotify.ts';
import { escapeHtml } from '../../shared/orgAuth.ts';

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
    // Derive signup identity from the authenticated user — never trust body-supplied identity.
    const email = user.email || body.email || '';
    const userId = user.id || body.user_id || '';
    const fullName = user.full_name || body.full_name || '';
    const authMethod = body.auth_method || '';

    if (!email) {
      console.error('notifySuperAdminSignup: unable to resolve signup email');
      return Response.json({ error: 'Missing email' }, { status: 400 });
    }

    // Escape all user-derived content to prevent XSS in email/notification bodies.
    const safeEmail = escapeHtml(email);
    const safeFullName = escapeHtml(fullName);
    const safeAuthMethod = escapeHtml(authMethod);
    const safeUserId = escapeHtml(userId);

    const notifyResult = await notifySuperAdmins({
      base44,
      subject: `New User Signup: ${safeEmail}`,
      htmlBody: `
        <h2>New User Signup</h2>
        <p>A new user has signed up to ScorekeeperAI:</p>
        <ul>
          <li><strong>Email:</strong> ${safeEmail}</li>
          <li><strong>Name:</strong> ${safeFullName || '—'}</li>
          <li><strong>Auth Method:</strong> ${safeAuthMethod || '—'}</li>
          <li><strong>User ID:</strong> ${safeUserId || '—'}</li>
        </ul>
      `,
      notificationType: 'signup',
      title: `New signup: ${safeEmail}`,
      message: `${safeFullName || safeEmail} signed up via ${safeAuthMethod || 'auth'}.`,
      data: {
        user_id: userId,
        email,
        auth_method: authMethod,
        full_name: fullName,
      },
    });

    return Response.json({ success: true, notifyResult });
  } catch (error) {
    console.error('notifySuperAdminSignup error:', error?.message || error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}