import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { hashAccessCode } from "../../shared/adminCode.ts";

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

    return Response.json({ success: true, organization_name: matched.organization_name });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}