import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { hashAccessCode } from "../../shared/adminCode.ts";
import { notifySuperAdmins } from '../../shared/superAdminNotify.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { code } = body;
    if (!code) return Response.json({ error: 'Missing access code' }, { status: 400 });

    // Service role bypasses RLS to find the user's approved, unused request.
    const requests = await base44.asServiceRole.entities.AdminRequest.filter({
      user_email: user.email,
      status: 'approved',
      code_used: false,
    });

    // Constant-time-ish comparison: hash the entered code against each salt.
    let matched: any = null;
    for (const r of requests) {
      if (!r.access_code_hash || !r.access_code_salt) continue;
      const hash = await hashAccessCode(code, r.access_code_salt);
      if (hash === r.access_code_hash) {
        matched = r;
        break;
      }
    }

    if (!matched) {
      return Response.json({ error: 'Invalid access code' }, { status: 400 });
    }

    // Mark code as used (service role) and complete onboarding (user scope).
    await base44.asServiceRole.entities.AdminRequest.update(matched.id, {
      code_used: true,
    });
    await base44.auth.updateMe({ onboarding_completed: true });

    // Notify super admins that the requestor's sign-up/verification has completed.
    try {
      await notifySuperAdmins({
        base44,
        subject: `Admin Sign-Up Completed: ${matched.organization_name}`,
        htmlBody: `
          <h2>Admin Sign-Up Completed</h2>
          <p>A requestor has successfully completed their admin sign-up by verifying their access code.</p>
          <ul>
            <li><strong>Name:</strong> ${matched.user_name || '—'}</li>
            <li><strong>Email:</strong> ${matched.user_email}</li>
            <li><strong>Organization:</strong> ${matched.organization_name}</li>
            <li><strong>Completed At:</strong> ${new Date().toISOString()}</li>
          </ul>
        `,
        notificationType: 'signup',
        title: `Sign-up completed: ${matched.user_name || matched.user_email}`,
        message: `${matched.user_name || matched.user_email} completed admin sign-up for ${matched.organization_name}.`,
        data: {
          user_email: matched.user_email,
          user_name: matched.user_name,
          organization_name: matched.organization_name,
          completed_at: new Date().toISOString(),
        },
      });
    } catch (e) {
      console.error('verifyAdminCode: failed to notify super admins of sign-up completion:', e?.message || e);
    }

    return Response.json({ success: true, organization_name: matched.organization_name });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}