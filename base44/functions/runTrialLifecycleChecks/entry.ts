import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { runTrialLifecycleSweep } from '../../shared/trialLifecycle.ts';

/**
 * Trial lifecycle checks — 7-day trial reminders, one-time catch-up reminder,
 * and automatic downgrade of trials that ended without a subscription.
 *
 * Super-admin only. The daily scheduled run reaches the same sweep through
 * runDataHealthChecks; this endpoint exists for manual runs and verification.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' || !user.is_super_admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const summary = await runTrialLifecycleSweep(base44);
    return Response.json({ ok: true, ...summary });
  } catch (error: any) {
    console.error('runTrialLifecycleChecks error:', error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}