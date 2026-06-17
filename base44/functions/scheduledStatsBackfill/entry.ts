import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Scheduled driver: processes a capped batch of pending completed games per org each run.
// Idempotent via aggregatePlayerStats. Safe to run repeatedly; does nothing once everything is aggregated.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const orgs = await base44.asServiceRole.entities.Organization.list();
    const summary = [];

    for (const org of (orgs || [])) {
      try {
        const res = await base44.asServiceRole.functions.invoke('aggregatePlayerStats', {
          organization_id: org.id,
          max_games: 8
        });
        const d = res?.data ?? res ?? {};
        summary.push({ org: org.id, processed: d.processed_games ?? 0, remaining: d.remaining_games ?? 0 });
      } catch (err) {
        summary.push({ org: org.id, error: String(err?.message || err).slice(0, 120) });
      }
      await sleep(2000);
    }

    return Response.json({ ok: true, summary });
  } catch (error) {
    console.error('scheduledStatsBackfill error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});